import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { internalError, parseJsonBody } from '@/lib/api';
import { getErrorMessage, getLocalDateKey } from '@/lib/dashboard';
import type { ChatImagePayload } from '@/lib/types';
import {
  ChatRequestSchema,
  FoodItemSchema,
  MeasurementSchema,
  SleepLogSchema,
  WorkoutLogSchema,
  UserProfileSchema,
  GoalSchema,
  DayTypeEntrySchema,
} from '@/lib/validation';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
You are the LiveFit AI - a concise fitness tracking assistant.
Your goal is to parse user messages into structured log data.

If the user is new or hasn't set their profile yet, proactively ask for their age, gender, height, and primary fitness goal.
Once they provide this info, respond with a confirmation and include a "profile" or "goals" data block.

NUTRITION REFERENCE:
- Egg (large): 7g protein, 70kcal, 0g carb, 5g fat, 0g fiber
- Milk (100ml): 3.1g protein, 58kcal, 4.7g carb, 3.2g fat, 0g fiber
- Paneer (100g): 18g protein, 265kcal, 4g carb, 20g fat, 0g fiber
- Dal cooked (100g): 9g protein, 116kcal, 20g carb, 4g fat, 4g fiber
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

Categories: food, workout, sleep, measurement, profile, goals, dayType.
Identify the category and provide relevant fields.
For food: items (array of name, protein, kcal, carbs, fats, fiber), totals.
For workout: focus, volume (kg), prs.
For sleep: hours, bed, wake.
For measurement: weight, waist, chest, etc.
For profile: age, gender, height, primaryGoal.
For goals: proteinTarget, kcalTarget, waterTarget, sleepTarget.
For dayType: dayType (Rest, Training, Lite), dayKey (optional, YYYY-MM-DD).
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
  const envelopes = extractParsedLogs(text);
  if (envelopes.length === 0) return;

  for (const parsed of envelopes) {
    if (!parsed.category || !parsed.data) continue;

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Food Logs
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
        }

        // 2. Workout Logs
        else if (parsed.category === 'workout') {
          console.log('Saving workout log...');
          const validated = WorkoutLogSchema.parse(parsed.data);
          const prs = getRecordValue(parsed.data, 'prs');
          const detailsFallback = prs ? JSON.stringify(prs) : undefined;

          await tx.workoutLog.create({
            data: {
              userId,
              focus: validated.focus,
              volume: validated.volume,
              details: validated.details || detailsFallback,
            },
          });
        }

        // 3. Sleep Logs
        else if (parsed.category === 'sleep') {
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
        }

        // 4. Measurements
        else if (parsed.category === 'measurement') {
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

        // 5. Profile Updates
        else if (parsed.category === 'profile') {
          console.log('Updating user profile via AI...');
          const raw = parsed.data as any;
          // Coerce to numbers as AI often sends strings
          const data = {
            ...raw,
            age: raw.age ? Number.parseInt(raw.age, 10) : undefined,
            height: raw.height ? Number.parseFloat(raw.height) : undefined,
          };
          const validated = UserProfileSchema.parse(data);
          await (tx as any).userProfile.upsert({
            where: { userId },
            create: { userId, ...validated },
            update: validated,
          });
        }

        // 6. Goal Updates
        else if (parsed.category === 'goals') {
          console.log('Updating user goals via AI...');
          const raw = parsed.data as any;
          const data = {
            ...raw,
            proteinTarget: raw.proteinTarget ? Number.parseFloat(raw.proteinTarget) : undefined,
            kcalTarget: raw.kcalTarget ? Number.parseFloat(raw.kcalTarget) : undefined,
            waterTarget: raw.waterTarget ? Number.parseFloat(raw.waterTarget) : undefined,
            sleepTarget: raw.sleepTarget ? Number.parseFloat(raw.sleepTarget) : undefined,
          };
          const validated = GoalSchema.parse(data);
          await tx.goal.upsert({
            where: { userId },
            create: { userId, ...validated },
            update: validated,
          });
        }

        // 7. Day Type Updates
        else if (parsed.category === 'dayType') {
          console.log('Updating day type via AI...', parsed.data);
          const raw = parsed.data as any;
          const today = getLocalDateKey(new Date());
          const dayKey = raw.dayKey || today;
          
          let dayType = raw.dayType || '';
          // Normalize case and common variations
          if (dayType.toLowerCase().includes('train')) dayType = 'Training';
          else if (dayType.toLowerCase().includes('rest')) dayType = 'Rest';
          else if (dayType.toLowerCase().includes('lite')) dayType = 'Lite';

          console.log(`Resolved DayType: ${dayType} for ${dayKey}`);

          await tx.dayTypeEntry.upsert({
            where: {
              userId_dayKey: {
                userId,
                dayKey,
              },
            },
            update: {
              dayType,
            },
            create: {
              userId,
              dayKey,
              dayType,
            },
          });
          console.log('Day type upserted successfully.');
        }
      });
    } catch (error) {
      console.error(`Persistence failed for ${parsed.category}:`, getErrorMessage(error));
      throw error;
    }
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
        // Save user message
        const serializedImages = body.images.length > 0 ? JSON.stringify(body.images) : null;
        await (prisma as any).chatMessage.create({
          data: {
            userId: session.user.id,
            role: 'user',
            text: body.prompt || (body.images.length > 0 ? 'Image attached' : ''),
            images: serializedImages,
          }
        });

        // Try extracting and running logs
        await persistLogData(text, session.user.id);

        const cleanText = text.replace(/\|\|\|DATA[\s\S]*?\|\|\|/, "").trim();

        // Finally, save AI response
        await (prisma as any).chatMessage.create({
          data: {
            userId: session.user.id,
            role: 'model',
            text: cleanText,
          }
        });
      } catch (error) {
        console.error('Chat log persistence failed:', getErrorMessage(error));
        warning = 'Reply generated, but it could not be saved to your history completely.';
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

function extractParsedLogs(text: string): ParsedLogEnvelope[] {
  const regex = /\|\|\|DATA\s*([\s\S]*?)\|\|\|/g;
  const logs: ParsedLogEnvelope[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as ParsedLogEnvelope;
      if (parsed) logs.push(parsed);
    } catch (e) {
      console.warn('Failed to parse a DATA block from AI:', e);
    }
  }

  return logs;
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
