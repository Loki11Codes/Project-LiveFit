import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { internalError, parseJsonBody } from '@/lib/api';
import { persistLogData } from '@/lib/persistence';
import { getErrorMessage } from '@/lib/dashboard';
import type { ChatImagePayload } from '@/lib/types';
import {
  ChatRequestSchema,
} from '@/lib/validation';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const getSystemPrompt = () => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return `
You are the LiveFit AI - a concise fitness tracking assistant.
Your goal is to parse user messages into structured log data.

CURRENT CONTEXT:
- Today's Date: ${dateStr}
- Current Time: ${timeStr}

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

Example for dayType:
|||DATA
{
  "category": "dayType",
  "dayType": "Training",
  "dayKey": "${dateStr}"
}
|||
Got it! I've set today as a Training day.

CRITICAL: You MUST include the |||DATA block for every loggable action (food, workout, dayType, etc.). If you are just answering a question, no block is needed. But for logging or status changes, the block is MANDATORY.

Categories: food, workout, sleep, measurement, profile, goals, dayType.
Identify the category and provide relevant fields.
For food: items (array of name, protein, kcal, carbs, fats, fiber), totals.
For workout: focus, volume (kg), prs.
For sleep: hours, bed, wake.
For measurement: weight, waist, chest, etc.
For profile: age, gender, height, primaryGoal.
For goals: proteinTarget, kcalTarget, waterTarget, sleepTarget.
For dayType: dayType (Rest, Training, Lite), dayKey (optional, defaults to today).
`;
};

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
      const systemPrompt = getSystemPrompt();
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...history,
          { role: 'user', parts: buildGeminiPromptParts(prompt, images) },
        ],
      });
      const responseText = result.response.text();
      console.log(`Success with Gemini model: ${modelId}`);
      return responseText;
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
            { role: 'system', content: getSystemPrompt() },
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


export async function POST(req: Request) {
  const parsedBody = await parseJsonBody(req, ChatRequestSchema);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const body = parsedBody.data;

    const session = await getServerSession(authOptions);

    const { geminiKey, openRouterKey } = getAIKeys();

    if (!geminiKey && !openRouterKey) {
      return internalError('AI providers are not configured right now');
    }

    if (body.images.length > 0 && !geminiKey) {
      return internalError('Image analysis is temporarily unavailable');
    }

    // Save user message
    if (session?.user) {
      const serializedImages = body.images.length > 0 ? JSON.stringify(body.images) : null;
      try {
        await (prisma.chatMessage as any).create({
          data: {
            userId: session.user.id,
            role: 'user',
            text: body.prompt || (body.images.length > 0 ? '' : '...'),
            images: serializedImages,
          },
        });
      } catch (e) {
        console.error('Failed to save user message:', e);
      }
    }

    const text = await getAIResponse(body, geminiKey, openRouterKey);

    if (!text) {
      throw new Error('All AI providers failed');
    }

    let warning: string | undefined;
    if (session?.user) {
      warning = await handleUserResponse(text, body, session.user.id);
    }

    console.log('AI Response:', `${text.substring(0, 50)}...`);
    return NextResponse.json({ text, warning });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Chat Route Error:', message);
    return internalError('The AI service is unavailable right now. Please try again.');
  }
}

function getAIKeys() {
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
  return { geminiKey, openRouterKey };
}

async function getAIResponse(body: any, geminiKey: string | null, openRouterKey: string | null) {
  let text = '';

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

  return text;
}

async function handleUserResponse(text: string, body: any, userId: string): Promise<string | undefined> {
  try {
    // Try extracting and running logs
    const envelopes = extractParsedLogs(text);
    await persistLogData(envelopes, userId);

    // Clean text by removing all |||DATA ... ||| blocks without using a vulnerable regex
    let cleanText = text;
    let startIdx = cleanText.indexOf('|||DATA');
    while (startIdx >= 0) {
      const endMarker = '|||';
      const endIdx = cleanText.indexOf(endMarker, startIdx + 7); // Skip the initial marker
      if (endIdx >= 0) {
        cleanText = cleanText.substring(0, startIdx) + cleanText.substring(endIdx + endMarker.length);
        startIdx = cleanText.indexOf('|||DATA'); // Search again from start in cleaned text
      } else {
        break; // Malformed block, stop cleaning
      }
    }
    cleanText = cleanText.trim();

    // Finally, save AI response
    await (prisma.chatMessage as any).create({
      data: {
        userId,
        role: 'model',
        text: cleanText,
        images: null,
      },
    });
    return undefined;
  } catch (error) {
    console.error('Chat log persistence failed:', getErrorMessage(error));
    return 'Reply generated, but it could not be saved to your history completely.';
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
  const logs: ParsedLogEnvelope[] = [];
  const startMarker = '|||DATA';
  const endMarker = '|||';
  
  let currentPos = 0;
  
  while (true) {
    const startIdx = text.indexOf(startMarker, currentPos);
    if (startIdx === -1) break;
    
    const contentStart = startIdx + startMarker.length;
    const endIdx = text.indexOf(endMarker, contentStart);
    if (endIdx === -1) break;
    
    const jsonText = text.substring(contentStart, endIdx).trim();
    try {
      if (jsonText) {
        const parsed = JSON.parse(jsonText) as ParsedLogEnvelope;
        if (parsed) logs.push(parsed);
      }
    } catch (e) {
      console.warn('Failed to parse a DATA block from AI:', e);
    }
    
    currentPos = endIdx + endMarker.length;
  }

  return logs;
}



function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
