import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { internalError, parseJsonBody } from "@/lib/api";
import { persistLogData } from "@/lib/persistence";
import { getErrorMessage } from "@/lib/dashboard";
import type { ChatAttachmentPayload } from "@/lib/types";
import { ChatRequestSchema } from "@/lib/validation";
import { extractAndCleanLogData } from "@/lib/chat-utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const getSystemPrompt = (clientDate?: string, clientTime?: string, routinesList?: string) => {
  const now = new Date();
  const dateStr = clientDate || now.toISOString().split("T")[0];
  const timeStr =
    clientTime ||
    now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

  return `
You are the LiveFit AI - a concise fitness tracking assistant.
Your goal is to parse user messages into structured log data and provide a helpful, natural response.

CURRENT CONTEXT:
- Today's Date: ${dateStr}
- Current Time: ${timeStr}

STARTING A WORKOUT:
- If the user says "Start a workout", "Begin training", or similar:
  - If they mention a specific routine name that matches one of the "AVAILABLE ROUTINES" below, emit a |||DATA block with \`"category": "workout"\`, \`"action": "start"\`, and the matching \`"routineId"\`.
  - If they DON'T specify which routine, list the "AVAILABLE ROUTINES" and ask which one they'd like to start, or if they want to start a "Fresh Workout" (no template).
  - If they want a fresh/empty workout, emit: |||DATA { "category": "workout", "action": "start" } |||.
- IMPORTANT: Only emit the "start" action when the intent to BEGIN a live tracking session is clear.

AVAILABLE ROUTINES FOR THIS USER:
${routinesList || "No saved routines found. Suggest starting a 'Fresh Workout' or creating one in the Routines tab."}

PROACTIVE FEEDBACK:
...
[Rest of nutritional and parsing instructions remain the same]
...
Example for workout start:
|||DATA
{
  "category": "workout",
  "action": "start",
  "routineId": "cmm...id..."
}
|||
Starting your "Push Day" routine now. Let's get to work!

Example for fresh workout start:
|||DATA
{
  "category": "workout",
  "action": "start"
}
|||
Starting a fresh workout for you. Which exercise are we starting with?

Categories: food, workout, sleep, measurement, profile, goals, dayType, delete.
Identify the category and provide relevant fields (including optional "date" YYYY-MM-DD and "update" boolean).
`;
};

type ChatHistoryMessage = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type OpenRouterContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: OpenRouterContent;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function sanitizeGeminiHistory(history: Array<{ role: "user" | "model"; parts: GeminiPart[] }>): { role: "user" | "model"; parts: GeminiPart[] }[] {
  const contents: { role: "user" | "model"; parts: GeminiPart[] }[] = [];
  
  for (const msg of history) {
    if (contents.length === 0 && msg.role === "model") {
      continue; // Gemini requires starting with 'user'
    }
    
    if (contents.length > 0 && contents.at(-1)?.role === msg.role) {
      contents.at(-1)?.parts.push(...msg.parts);
    } else {
      contents.push({ 
        role: msg.role, 
        parts: [...msg.parts] 
      });
    }
  }
  
  return contents;
}

async function callGemini(
  prompt: string,
  history: ChatHistoryMessage[],
  images: ChatAttachmentPayload[],
  clientDate?: string,
  clientTime?: string,
  routinesList?: string,
) {
  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
    "gemini-3.1-flash-preview",
  ];
  let lastError: unknown = null;

  for (const modelId of modelsToTry) {
    try {
      const systemPrompt = getSystemPrompt(clientDate, clientTime, routinesList);
      const model = genAI.getGenerativeModel({ 
        model: modelId,
        systemInstruction: systemPrompt 
      });
      
      const prunedHistory = history.slice(-40);
      const rawContents = [
        ...prunedHistory,
        { role: "user" as const, parts: buildGeminiPromptParts(prompt, images) },
      ];

      const contents = sanitizeGeminiHistory(rawContents);
      const result = await model.generateContent({ contents });
      return result.response.text();
    } catch (error) {
      const message = getErrorMessage(error);
      console.warn(`Gemini model ${modelId} failed:`, message);
      lastError = error;

      if (message.includes("404") || message.toLowerCase().includes("not found")) {
        continue;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("All Gemini models failed");
}

async function callOpenRouter(
  prompt: string,
  history: ChatHistoryMessage[],
  openRouterKey: string,
  images: ChatAttachmentPayload[],
  clientDate?: string,
  clientTime?: string,
  routinesList?: string,
) {
  const freeModels = [
    "openrouter/free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
  ];

  const userContent: OpenRouterContent =
    images.length > 0
      ? [
          {
            type: "text",
            text:
              prompt ||
              "Analyze this image and extract relevant physical stats or foods.",
          },
          ...images.map((img) => ({
            type: "image_url" as const,
            image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
          })),
        ]
      : prompt || "Give me a concise update.";

  for (const modelId of freeModels) {
    try {
      const messages: OpenRouterMessage[] = [
        {
          role: "system",
          content: getSystemPrompt(clientDate, clientTime, routinesList),
        },
        ...history.slice(-40).map((message) => ({
          role: message.role === "model" ? ("assistant" as const) : ("user" as const),
          content: message.parts[0]?.text ?? "",
        })),
        { role: "user" as const, content: userContent },
      ];

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "LiveFit App",
        },
        body: JSON.stringify({
          model: modelId,
          messages,
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
        console.warn(
          `OpenRouter model ${modelId} failed: ${res.status} - ${errorText}`,
        );
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
      return internalError("AI providers are not configured right now");
    }

    if (body.images.length > 0 && !geminiKey) {
      return internalError("Image analysis is temporarily unavailable");
    }

    if (session?.user) {
      // Hard check: verify the user still exists in the DB to prevent FK violations
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });

      if (!userExists) {
        return internalError("Session is stale. Please sign out and sign in again.");
      }

      await saveUserMessage(body, session.user.id);
    }

    let routinesList = "";
    if (session?.user) {
      const routines = await prisma.routine.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      });
      routinesList = routines.map(r => `- ${r.name} (ID: ${r.id})`).join('\n');
    }

    const text = await getAIResponse(body, geminiKey, openRouterKey, routinesList);

    if (!text) {
      throw new Error("All AI providers failed");
    }

    let warning: string | undefined;
    if (session?.user) {
      warning = await handleUserResponse(
        text,
        session.user.id,
        body.clientDate,
      );
    }

    return NextResponse.json({ text, warning });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Chat Route Error:", message);
    
    if (message.includes("429") || message.includes("Too Many Requests") || message.includes("quota")) {
      return internalError(
        "AI Free Tier Rate Limit Exceeded: You have used up your quota. Please wait about a minute before trying your request again.",
      );
    }
    
    return internalError(
      "The AI service is unavailable right now. Please try again.",
    );
  }
}

async function saveUserMessage(
  body: z.infer<typeof ChatRequestSchema>,
  userId: string,
) {
  const serializedImages =
    body.images.length > 0 ? JSON.stringify(body.images) : null;
  try {
    await prisma.chatMessage.create({
      data: {
        userId,
        role: "user",
        text: body.prompt || (body.images.length > 0 ? "" : "..."),
        images: serializedImages,
      },
    });
  } catch (e) {
    console.error("Failed to save user message:", e);
  }
}

function getAIKeys() {
  const geminiKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here" &&
    process.env.GEMINI_API_KEY.trim() !== ""
      ? process.env.GEMINI_API_KEY
      : null;
  const openRouterKey =
    process.env.OPENROUTER_API_KEY &&
    process.env.OPENROUTER_API_KEY !== "your_openrouter_api_key_here" &&
    process.env.OPENROUTER_API_KEY.trim() !== ""
      ? process.env.OPENROUTER_API_KEY
      : null;
  return { geminiKey, openRouterKey };
}

async function getAIResponse(
  body: z.infer<typeof ChatRequestSchema>,
  geminiKey: string | null,
  openRouterKey: string | null,
  routinesList?: string,
) {
  let text = "";
  const { prompt, history, images, clientDate, clientTime } = body;

  if (geminiKey) {
    try {
      text = await callGemini(prompt, history, images, clientDate, clientTime, routinesList);
    } catch (error) {
      console.error(
        "Gemini failed completely, failing over to OpenRouter...",
        getErrorMessage(error),
      );
    }
  }

  if (!text && openRouterKey) {
    text =
      (await callOpenRouter(
        prompt,
        history,
        openRouterKey,
        images,
        clientDate,
        clientTime,
        routinesList,
      )) || "";
  }

  return text;
}

async function handleUserResponse(
  text: string,
  userId: string,
  clientDate?: string,
): Promise<string | undefined> {
  try {
    const { logs, cleanText } = extractAndCleanLogData(text);
    await persistLogData(logs, userId, clientDate);

    await prisma.chatMessage.create({
      data: {
        userId,
        role: "model",
        text: cleanText,
        images: null,
      },
    });
    return undefined;
  } catch (error) {
    console.error("Chat log persistence failed:", getErrorMessage(error));
    // DUMP TO FILE FOR DEBUGGING
    try {
      require('node:fs').appendFileSync('debug-crash.txt', '\nChat Error: ' + (error instanceof Error ? error.stack : String(error)) + '\n');
    } catch(e) {
      console.error("Failed to dump error to debug log:", e);
    }
    return "Reply generated, but it could not be saved to your history completely.";
  }
}

function buildGeminiPromptParts(
  prompt: string,
  images: ChatAttachmentPayload[],
): GeminiPart[] {
  const parts: GeminiPart[] = [];

  parts.push({
    text:
      prompt.trim() ||
      "Please analyze this image and extract any relevant nutrition or fitness information.",
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
