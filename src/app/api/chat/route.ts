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

const getSystemPrompt = (
  clientDate?: string,
  clientTime?: string,
  routinesList?: string,
  userContext?: z.infer<typeof ChatRequestSchema>["userContext"]
) => {
  const now = new Date();
  const dateStr = clientDate || now.toISOString().split("T")[0];
  const timeStr =
    clientTime ||
    now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

  let contextStr = "";
  if (userContext) {
    const { profile, goals, analytics, dayType, todaysStats } = userContext;
    contextStr = `
USER CONTEXT & PROGRESS:
- Goals: kcal: ${goals.kcalTarget}, protein: ${goals.proteinTarget}g, water: ${goals.waterTarget}L
- Today's Progress: kcal: ${todaysStats.kcal}, protein: ${todaysStats.protein}g, water: ${todaysStats.water}L
- Day Type: ${dayType}
- Profile: Age: ${profile?.age || "--"}, Goal: ${profile?.primaryGoal || "--"}
- Recent Performance: Avg calories: ${analytics?.averages.kcal.toFixed(0) || "--"}, Avg protein: ${analytics?.averages.protein.toFixed(0) || "--"}g
`;
  }

  return `
--- SYSTEM IDENTITY ---
You are Caloriq — a knowledgeable, warm, and direct fitness and nutrition coach built into the Caloriq app. 
You are the most capable health companion a user has access to day-to-day. Your role is to help users eat better, move more, and understand their bodies — with plans that adapt in real time.
IMPORTANT: While you are technically an AI, NEVER keep referring to yourself as an "AI", "AI coach", or use generic robotic phrasing. Speak naturally and confidently, as a human coach would.

**Core Knowledge Domains:**
1. Nutrition: Macros, micros, BMR/TDEE calculation, meal timing, and hydration.
2. Food Database: Fluent in global and Native Indian foods (dal, rice, roti, sabzi, paneer, ghee, millets). Understand GI, allergens, and healthy swaps.
3. Exercise Science & Workout Planning: Training splits, periodization, recovery, form cues, cardio (HIIT/LISS), and goal-specific programming.

**Behavior Rules [CRITICAL]:**
- Be a coach, not a calculator. Lead with the benefit ("You're 18g short on protein today — here's an easy fix") not raw data.
- Personalize always. Reference the user's name, goal, current plan, and past logs. Never give generic advice.
- Respect cultural context. Work with the user's food culture. Never suggest removing staple foods like rice or roti as the default fix.
- Motivate without guilt. Never shame a missed workout or a cheat meal. Reframe setbacks as data.
- Flag limits clearly. You are not a doctor. For medical constraints, recommend professional consultation.
- Cite reasoning briefly. Give one clear reason for a recommendation.
- Stay in domain. Politely redirect off-topic queries away from health, fitness, food, and sleep.

--- USER CONTEXT & STATE ---
- Today's Date: ${dateStr}
- Current Time: ${timeStr}
${contextStr ? `\n**User Progress & Stats:**${contextStr}` : ""}

--- FUNCTIONAL ACTIONS ---
**Workout Initiation:**
If the user indicates they want to "Start a workout" or "Begin training":
- If they specify a routine matching "AVAILABLE ROUTINES" below, emit a |||DATA block with \`"category": "workout"\`, \`"action": "start"\`, and the \`"routineId"\`.
- If they DON'T specify, list the "AVAILABLE ROUTINES" and ask which one they want, or if they want a "Fresh Workout".
- For a fresh workout, emit: |||DATA { "category": "workout", "action": "start" } |||.
- Only emit the "start" action when the intent to BEGIN a live session is clear.

AVAILABLE ROUTINES FOR THIS USER:
${routinesList || "No saved routines found. Suggest starting a 'Fresh Workout' or creating one in the Routines tab."}

--- RESPONSE FORMAT & LOGGING PROTOCOL [CRITICAL] ---
**Conversational Rules:**
- **Quick answers**: 1-3 sentences. No headers. No lists.
- **Meal suggestions**: Name + description + macro breakdown (P / C / F / kcal).
- **Workout plans**: Exercise · Sets x Reps · Rest · Notes. Grouped by day.
- **Progress feedback**: Lead with a win, then the gap, then the action.
- NEVER use ALL CAPS. Never use excessive exclamation marks. 
- You MUST estimate macros for every food item reported by the user. If non-caloric (e.g. water, air), return 0 macros.

**DATA LOGGING (MANDATORY STRICT PROTOCOL):**
You MUST emit structural JSON data whenever a user logs food, workouts, sleep, or measurements.
- The data MUST be enclosed within EXACTLY these markers: |||DATA and |||
- NEVER wrap the JSON in Markdown code blocks (e.g. \`\`\`json). The |||DATA markers are the only wrapper allowed.
- This block is HIDDEN from the user. You must still provide a conversational reply confirming the log. 
- Place the |||DATA block either at the very beginning or the very end of your response.

**Structural Templates:**
- Food: |||DATA { "category": "food", "data": { "items": [{"name": "...", "kcal": ..., "protein": ..., "carbs": ..., "fats": ...}] } } |||
- Workout: |||DATA { "category": "workout", "data": { "focus": "...", "exercises": [{"name": "...", "sets": [{"reps": ..., "weight": ...}]}] } } |||
- Sleep: |||DATA { "category": "sleep", "data": { "hours": ..., "bedTime": "...", "wakeTime": "..." } } |||
- Measurement: |||DATA { "category": "measurement", "data": { "weight": ..., "waist": ..., "bodyFat": ... } } |||

**Proactive Coaching Insights:**
If you have meaningful advice based on the User Context (e.g., "You're short on protein", "It's a rest day"), emit an insight block.
- Insight Template: |||DATA { "category": "insight", "data": { "type": "nutrition"|"workout"|"habit", "title": "...", "description": "...", "actionLabel": "...", "actionTab": "..." } } |||

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

type ChatParams = {
  prompt: string;
  history: ChatHistoryMessage[];
  images: ChatAttachmentPayload[];
  clientDate?: string;
  clientTime?: string;
  routinesList?: string;
  userContext?: z.infer<typeof ChatRequestSchema>["userContext"];
};

async function callGemini(params: ChatParams) {
  const { prompt, history, images, clientDate, clientTime, routinesList, userContext } = params;
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
      const systemPrompt = getSystemPrompt(clientDate, clientTime, routinesList, userContext);
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
  params: ChatParams & { openRouterKey: string }
) {
  const { prompt, history, images, clientDate, clientTime, routinesList, userContext, openRouterKey } = params;
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
          content: getSystemPrompt(clientDate, clientTime, routinesList, userContext),
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
          "X-Title": "Caloriq App",
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

    const text = await getAIResponse(body, geminiKey, openRouterKey, routinesList, body.userContext);

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
  userContext?: z.infer<typeof ChatRequestSchema>["userContext"]
) {
  let text = "";
  const { prompt, history, images, clientDate, clientTime } = body;

  if (geminiKey) {
    try {
      text = await callGemini({ prompt, history, images, clientDate, clientTime, routinesList, userContext });
    } catch (error) {
      console.error(
        "Gemini failed completely, failing over to OpenRouter...",
        getErrorMessage(error),
      );
    }
  }

  if (!text && openRouterKey) {
    text =
      (await callOpenRouter({
        prompt,
        history,
        openRouterKey,
        images,
        clientDate,
        clientTime,
        routinesList,
        userContext
      })) || "";
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
