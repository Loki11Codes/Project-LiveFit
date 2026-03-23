import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
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

const getSystemPrompt = (clientDate?: string, clientTime?: string) => {
  const now = new Date();
  const dateStr = clientDate || now.toISOString().split('T')[0];
  const timeStr = clientTime || now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return `
You are the LiveFit AI - a concise fitness tracking assistant.
Your goal is to parse user messages into structured log data and provide a helpful, natural response.

CURRENT CONTEXT:
- Today's Date: ${dateStr}
- Current Time: ${timeStr}

PROACTIVE FEEDBACK:
- If a user provides incomplete information (e.g., "I had chicken" without quantity, or "I worked out" without details), proactively ask a clarifying question in your natural language response (e.g., "How much chicken did you have?" or "Which exercises did you focus on today?").
- You can still provide a partial log entry if you have enough info to guess, but prioritize getting the missing details if they are essential for accuracy.

SMART UPDATES:
- If the user is correcting, refining, or adding to a log entry they just mentioned (e.g., "Actually it was 200g" or "I also did some cardio"), include \`"update": true\` in the |||DATA block.
- Ensure the \`name\` (for food) or \`focus\` (for workout) exactly matches the previous entry you want to update.
- The backend uses (name/focus + date) to identify which entry to update.

NUTRITION REFERENCE:
- Egg (large): 7g protein, 70kcal, 0g carb, 5g fat, 0g fiber
- Milk (100ml): 3.1g protein, 58kcal, 4.7g carb, 3.2g fat, 0g fiber
- Paneer (100g): 18g protein, 265kcal, 4g carb, 20g fat, 0g fiber
- Dal cooked (100g): 9g protein, 116kcal, 20g carb, 4g fat, 4g fiber
- Rice cooked (100g): 2.7g protein, 130kcal, 28g carb, 0.3g fat, 0.4g fiber
- Chapati (1): 3g protein, 120kcal, 20g carb, 3g fat, 2g fiber

RESPONSE FORMAT:
Your response must be a JSON object followed by a natural language message.
The JSON block should be between |||DATA and |||.

Example for dayType update:
|||DATA
{
  "category": "dayType",
  "dayType": "Training",
  "date": "2026-03-18"
}
|||
Confirmed! I've set today as a training day for you.

CRITICAL: You MUST include the |||DATA block for every loggable action. 
If the user provides multiple actions (e.g. eating multiple foods at once, or several workouts), you can output a single |||DATA block containing a JSON array of objects, or output multiple separate |||DATA blocks.

Categories: food, workout, sleep, measurement, profile, goals, dayType.
Identify the category and provide relevant fields (including optional "date" YYYY-MM-DD and "update" boolean).
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
  images: ChatImagePayload[],
  clientDate?: string,
  clientTime?: string
) {

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
      const systemPrompt = getSystemPrompt(clientDate, clientTime);
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...history,
          { role: 'user', parts: buildGeminiPromptParts(prompt, images) },
        ],
      });
      const responseText = result.response.text();

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
  openRouterKey: string,
  clientDate?: string,
  clientTime?: string
) {


  const freeModels = [
    'openrouter/free',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
  ];

  for (const modelId of freeModels) {
    try {

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
            { role: 'system', content: getSystemPrompt(clientDate, clientTime) },
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
        await prisma.chatMessage.create({
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
      warning = await handleUserResponse(text, body, session.user.id, body.clientDate);
    }


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

async function getAIResponse(body: z.infer<typeof ChatRequestSchema>, geminiKey: string | null, openRouterKey: string | null) {
  let text = '';
  const { prompt, history, images, clientDate, clientTime } = body;

  if (geminiKey) {
    try {
      text = await callGemini(prompt, history, images, clientDate, clientTime);
    } catch (error) {
      if (images.length > 0) {
        throw error;
      }
      console.error(
        'Gemini failed completely, failing over to OpenRouter...',
        getErrorMessage(error)
      );
    }
  }

  if (!text && openRouterKey && images.length === 0) {
    text = (await callOpenRouter(prompt, history, openRouterKey, clientDate, clientTime)) || '';
  }

  return text;
}

async function handleUserResponse(text: string, body: z.infer<typeof ChatRequestSchema>, userId: string, clientDate?: string): Promise<string | undefined> {
  try {
    // Try extracting and running logs
    const envelopes = extractParsedLogs(text);
    await persistLogData(envelopes, userId, clientDate);

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
    await prisma.chatMessage.create({
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
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          logs.push(...(parsed as ParsedLogEnvelope[]));
        } else if (parsed) {
          logs.push(parsed as ParsedLogEnvelope);
        }
      }
    } catch (e) {
      console.warn('Failed to parse a DATA block from AI:', e);
    }
    
    currentPos = endIdx + endMarker.length;
  }

  return logs;
}



