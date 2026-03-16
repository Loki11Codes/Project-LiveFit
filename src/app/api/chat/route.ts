import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { internalError, parseJsonBody } from '@/lib/api';
import { getErrorMessage } from '@/lib/dashboard';
import type { ChatImagePayload } from '@/lib/types';
import {
  ChatRequestSchema,
  FoodItemSchema,
  MeasurementSchema,
  SleepLogSchema,
  WorkoutLogSchema,
} from '@/lib/validation';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
You are the LiveFit AI - a concise fitness tracking assistant.
Your goal is to parse user messages into structured log data.

NUTRITION REFERENCE:
- Egg (large): 7g protein, 70kcal, 0g carb, 5g fat, 0g fiber
- Milk (100ml): 3.1g protein, 58kcal, 4.7g carb, 3.2g fat, 0g fiber
- Paneer (100g): 18g protein, 265kcal, 4g carb, 20g fat, 0g fiber
- Dal cooked (100g): 9g protein, 116kcal, 20g carb, 0.4g fat, 4g fiber
- Rice cooked (100g): 2.7g protein, 130kcal, 28g carb, 0.3g fat, 0.4g fiber
- Chapati (1): 3g protein, 120kcal, 20g carb, 3g fat, 2g fiber

IMAGE HANDLING:
- For nutrition labels, extract protein, calories, carbs, fats, and fiber exactly.
- For food photos, identify the dish and estimate the same five nutrients.
- For workout screenshots, extract the relevant workout stats if visible.

RESPONSE FORMAT:
Your response must be a JSON object followed by a natural language message.
The JSON block should be between |||DATA and |||.

Example:
|||DATA
{
  "category": "food",
  "data": {
    "items": [{ "name": "eggs", "protein": 14, "kcal": 140, "carbs": 0, "fats": 10, "fiber": 0 }],
    "totals": { "protein": 14, "kcal": 140, "carbs": 0, "fats": 10, "fiber": 0 }
  }
}
|||
Logged 2 eggs for you! That's 14g of protein.

Categories: food, workout, sleep, measurement.
Identify the category and provide relevant fields.
For food: items (array of name, protein, kcal, carbs, fats, fiber), totals.
For workout: focus, volume (kg), prs.
For sleep: hours, bed, wake.
For measurement: weight, waist, chest, etc.
`;

type ChatHistoryMessage = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ParsedLogEnvelope = {
  category?: string;
  data?: unknown;
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

async function callGemini(
  prompt: string,
  history: ChatHistoryMessage[],
  images: ChatImagePayload[]
) {
  console.log('Using Gemini...');
  const modelsToTry = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-preview',
    'gemini-3-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];
  let lastError: unknown = null;

  for (const modelId of modelsToTry) {
    try {
      console.log(`Trying Gemini model: ${modelId}...`);
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          ...history,
          { role: 'user', parts: buildGeminiPromptParts(prompt, images) },
        ],
      });
      console.log(`Success with Gemini model: ${modelId}`);
      return result.response.text();
    } catch (error) {
      const message = getErrorMessage(error);
      console.warn(`Gemini model ${modelId} failed:`, message);
      lastError = error;

      if (message.includes('404') || message.toLowerCase().includes('not found')) {
        continue;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('All Gemini models failed');
}

async function callOpenRouter(
  prompt: string,
  history: ChatHistoryMessage[],
  openRouterKey: string
) {
  console.log('Using OpenRouter...');

  const freeModels = [
    'openrouter/free',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
  ];

  for (const modelId of freeModels) {
    try {
      console.log(`Trying OpenRouter model: ${modelId}...`);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'LiveFit App',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.map((message) => ({
              role: message.role === 'model' ? 'assistant' : 'user',
              content: message.parts[0]?.text ?? '',
            })),
            { role: 'user', content: prompt || 'Give me a concise update.' },
          ],
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as OpenRouterResponse;
        const content = data.choices?.[0]?.message?.content;

        if (content) {
          console.log(`Success with model: ${modelId}`);
          return content;
        }
      } else {
        const errorText = await res.text();
        console.warn(`OpenRouter model ${modelId} failed: ${res.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`Error with model ${modelId}:`, getErrorMessage(error));
    }
  }

  return null;
}

async function persistLogData(text: string, userId: string) {
  try {
    const parsed = extractParsedLog(text);
    if (!parsed?.category) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.category === 'food' && hasItemsArray(parsed.data)) {
        console.log('Saving food logs...');
        for (const item of parsed.data.items) {
          const validated = FoodItemSchema.parse(item);
          await tx.foodLog.create({
            data: {
              userId,
              name: validated.name,
              kcal: validated.kcal,
              protein: validated.protein,
              carbs: validated.carbs,
              fats: validated.fats,
              fiber: validated.fiber,
            },
          });
        }
        return;
      }

      if (parsed.category === 'workout') {
        console.log('Saving workout log...');
        const validated = WorkoutLogSchema.parse(parsed.data);
        const detailsFallback = serializeJsonValue(getRecordValue(parsed.data, 'prs'));

        await tx.workoutLog.create({
          data: {
            userId,
            focus: validated.focus,
            volume: validated.volume,
            details: validated.details || detailsFallback,
          },
        });
        return;
      }

      if (parsed.category === 'sleep') {
        console.log('Saving sleep log...');
        const validated = SleepLogSchema.parse(parsed.data);

        await tx.sleepLog.create({
          data: {
            userId,
            hours: validated.hours,
            bedTime: validated.bedTime || getStringValue(parsed.data, 'bed'),
            wakeTime: validated.wakeTime || getStringValue(parsed.data, 'wake'),
          },
        });
        return;
      }

      if (parsed.category === 'measurement') {
        console.log('Saving body measurement...');
        const validated = MeasurementSchema.parse(parsed.data);

        await tx.bodyMeasurement.create({
          data: {
            userId,
            weight: validated.weight,
            waist: validated.waist,
            chest: validated.chest,
            arms: validated.arms,
            thighs: validated.thighs,
            hips: validated.hips,
          },
        });
      }
    });
  } catch (error) {
    console.error('Failed to save to database or validation failed:', getErrorMessage(error));
    throw error;
  }
}

export async function POST(req: Request) {
  const parsedBody = await parseJsonBody(req, ChatRequestSchema);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const body = parsedBody.data;

    const session = await getServerSession(authOptions);

    console.log('--- Chat Request ---');
    console.log('User:', session?.user?.email || 'Guest');

    const geminiKey =
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
      process.env.GEMINI_API_KEY.trim() !== ''
        ? process.env.GEMINI_API_KEY
        : null;
    const openRouterKey =
      process.env.OPENROUTER_API_KEY &&
      process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here' &&
      process.env.OPENROUTER_API_KEY.trim() !== ''
        ? process.env.OPENROUTER_API_KEY
        : null;

    if (!geminiKey && !openRouterKey) {
      return internalError('AI providers are not configured right now');
    }

    if (body.images.length > 0 && !geminiKey) {
      return internalError('Image analysis is temporarily unavailable');
    }

    let text = '';
    let warning: string | undefined;

    if (geminiKey) {
      try {
        text = await callGemini(body.prompt, body.history, body.images);
      } catch (error) {
        if (body.images.length > 0) {
          throw error;
        }

        console.error(
          'Gemini failed completely, failing over to OpenRouter...',
          getErrorMessage(error)
        );
      }
    }

    if (!text && openRouterKey && body.images.length === 0) {
      text = (await callOpenRouter(body.prompt, body.history, openRouterKey)) || '';
    }

    if (!text) {
      throw new Error('All AI providers failed');
    }

    if (session?.user) {
      try {
        await persistLogData(text, session.user.id);
      } catch (error) {
        console.error('Chat log persistence failed:', getErrorMessage(error));
        warning = 'Reply generated, but this entry could not be saved to your dashboard.';
      }
    }

    console.log('AI Response:', `${text.substring(0, 50)}...`);
    return NextResponse.json({ text, warning });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Chat Route Error:', message);
    return internalError('The AI service is unavailable right now. Please try again.');
  }
}

function buildGeminiPromptParts(
  prompt: string,
  images: ChatImagePayload[]
): GeminiPart[] {
  const parts: GeminiPart[] = [];

  parts.push({
    text:
      prompt.trim() ||
      'Please analyze this image and extract any relevant nutrition or fitness information.',
  });

  for (const image of images) {
    parts.push({
      inlineData: {
        mimeType: image.mediaType,
        data: image.base64,
      },
    });
  }

  return parts;
}

function extractParsedLog(text: string): ParsedLogEnvelope | null {
  const match = /\|\|\|DATA\s*([\s\S]*?)\|\|\|/.exec(text);
  if (!match) {
    return null;
  }

  return JSON.parse(match[1]) as ParsedLogEnvelope;
}

function hasItemsArray(value: unknown): value is { items: unknown[] } {
  return isRecord(value) && Array.isArray(value.items);
}

function getStringValue(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];
  return typeof nestedValue === 'string' ? nestedValue : undefined;
}

function getRecordValue(value: unknown, key: string): unknown {
  if (!isRecord(value)) {
    return undefined;
  }

  return value[key];
}

function serializeJsonValue(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
