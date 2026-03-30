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

const getSystemPrompt = (clientDate?: string, clientTime?: string) => {
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

PROACTIVE FEEDBACK:
- If a user provides incomplete information (e.g., "I had chicken" without quantity, or "I worked out" without details), proactively ask a clarifying question in your natural language response (e.g., "How much chicken did you have?" or "Which exercises did you focus on today?").
- You can still provide a partial log entry if you have enough info to guess, but prioritize getting the missing details if they are essential for accuracy.

SMART UPDATES AND CORRECTIONS:
- CRITICAL: If you ask a clarifying question (e.g. "How many ML of Gatorade?"), and the user answers ("500ml"), you MUST use \`"update": true\` when logging it. 
- Do NOT log it as a new row if you are just adding details to a food or workout you already tried to log in the previous turn. Include \`"update": true\` in the |||DATA block.
- Ensure the \`name\` (for food) or \`focus\` (for workout) exactly matches the previous entry you want to update.
- The backend relies on \`"update": true\` + matching \`name\` to replace the incomplete log instead of duplicating it.

NUTRITION REFERENCE:
- Egg (large): 7g protein, 70kcal, 0g carb, 5g fat, 0g fiber
- Milk (100ml): 3.1g protein, 58kcal, 4.7g carb, 3.2g fat, 0g fiber
- Paneer (100g): 18g protein, 265kcal, 4g carb, 20g fat, 0g fiber
- Dal cooked (100g): 9g protein, 116kcal, 20g carb, 4g fat, 4g fiber
- Rice cooked (100g): 2.7g protein, 130kcal, 28g carb, 0.3g fat, 0.4g fiber
- Chapati (1): 3g protein, 120kcal, 20g carb, 3g fat, 2g fiber

NUTRITION SCREENSHOT PARSING:
- If the user provides a nutrition/meal log screenshot (e.g. a table of foods with protein/kcal/carbs/fats/fiber), extract ALL individual food items.
- Output a SINGLE |||DATA block with "category": "food" and an "items" array containing each row.
- Each item in "items" must have: "name", "protein" (g), "kcal", "carbs" (g), "fats" (g), "fiber" (g), and "date" (YYYY-MM-DD).
- If multiple meals appear in the same screenshot (e.g. Breakfast + Midday + Lunch), output one |||DATA block per meal group.
- Do NOT include summary/total rows as separate items. Only log the individual food rows.

Example for a nutrition screenshot with 2 items:
|||DATA
{
  "category": "food",
  "date": "2026-03-30",
  "items": [
    { "name": "Milk 150ml", "protein": 4.6, "kcal": 87, "carbs": 12, "fats": 4.8, "fiber": 0 },
    { "name": "Ragi Puttu 70g", "protein": 3, "kcal": 245, "carbs": 51, "fats": 1.5, "fiber": 4.5 }
  ]
}
|||

WORKOUT SCREENSHOT PARSING (HEVY/STRONG/ETC):
- If the user provides a workout summary screenshot, meticulously extract the entire structured routine.
- Include an "exercises" array containing each exercise "name" and a "sets" array.
- "sets" should have: "setNumber" (e.g. 1), "reps", "weight" (kg), "distance" (km), "duration" (seconds).
- Automatically calculate or extract the overall "volume" and "duration".
- You can ALSO do this for standard text inputs (e.g. "I did 3 sets of 12 bench press at 20kg").

RESPONSE FORMAT:
Your response must be a JSON object followed by a natural language message.
The JSON block should be between |||DATA and |||.

Example for full workout log:
|||DATA
{
  "category": "workout",
  "focus": "Chest, Arms & Delts",
  "volume": 3136,
  "date": "2026-03-25",
  "exercises": [
    {
      "name": "Incline Bench Press (Dumbbell)",
      "sets": [
        { "setNumber": 1, "reps": 12, "weight": 14 },
        { "setNumber": 2, "reps": 12, "weight": 14 },
        { "setNumber": 3, "reps": 12, "weight": 20 }
      ]
    }
  ]
}
|||
Great job on the Chest, Arms & Delts workout! I've logged all 17 sets.

CRITICAL: You MUST include the |||DATA block for every loggable action. 
If the user provides multiple actions (e.g. eating multiple foods at once, or several workouts), you can output a single |||DATA block containing a JSON array of objects, or output multiple separate |||DATA blocks.

DELETE LOGS:
- If the user asks to delete, remove, or undo a specific log entry, emit a |||DATA block with "category": "delete".
- Include "target" (food/workout/sleep/measurement/all), optional "name" for food or "focus" for workout, and optional "date" (YYYY-MM-DD).
- Use "target": "all" when the user wants to delete ALL logs for a day (food + workout + sleep + measurement).
- If no name is given and the user says "delete all food logs today", omit "name" to delete all food entries for that day.

Example: User says "Delete the Milk 150ml entry from today"
|||DATA
{
  "category": "delete",
  "target": "food",
  "name": "Milk 150ml",
  "date": "${dateStr}"
}
|||
Done! I've removed the Milk 150ml entry from today's log.

Example: User says "Remove today's workout"
|||DATA
{
  "category": "delete",
  "target": "workout",
  "date": "${dateStr}"
}
|||
Done! I've removed today's workout log.

Example: User says "Delete all of today's logs"
|||DATA
{
  "category": "delete",
  "target": "all",
  "date": "${dateStr}"
}
|||
Done! I've cleared all of today's logs — food, workout, sleep, and measurements have been removed.

Categories: food, workout, sleep, measurement, profile, goals, dayType, delete.
Identify the category and provide relevant fields (including optional "date" YYYY-MM-DD and "update" boolean).
`;
};

type ChatHistoryMessage = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
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

async function callGemini(
  prompt: string,
  history: ChatHistoryMessage[],
  images: ChatAttachmentPayload[],
  clientDate?: string,
  clientTime?: string,
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
      const systemPrompt = getSystemPrompt(clientDate, clientTime);
      const model = genAI.getGenerativeModel({ 
        model: modelId,
        systemInstruction: systemPrompt 
      });
      const result = await model.generateContent({
        contents: [
          ...history,
          { role: "user", parts: buildGeminiPromptParts(prompt, images) },
        ],
      });
      const responseText = result.response.text();

      return responseText;
    } catch (error) {
      const message = getErrorMessage(error);
      console.warn(`Gemini model ${modelId} failed:`, message);
      lastError = error;

      if (
        message.includes("404") ||
        message.toLowerCase().includes("not found")
      ) {
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
  clientDate?: string,
  clientTime?: string,
) {
  const freeModels = [
    "openrouter/free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
  ];

  for (const modelId of freeModels) {
    try {
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
          messages: [
            {
              role: "system",
              content: getSystemPrompt(clientDate, clientTime),
            },
            ...history.map((message) => ({
              role: message.role === "model" ? "assistant" : "user",
              content: message.parts[0]?.text ?? "",
            })),
            { role: "user", content: prompt || "Give me a concise update." },
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
      await saveUserMessage(body, session.user.id);
    }

    const text = await getAIResponse(body, geminiKey, openRouterKey);

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
) {
  let text = "";
  const { prompt, history, images, clientDate, clientTime } = body;

  if (geminiKey) {
    try {
      text = await callGemini(prompt, history, images, clientDate, clientTime);
    } catch (error) {
      if (images.length > 0) {
        throw error;
      }
      console.error(
        "Gemini failed completely, failing over to OpenRouter...",
        getErrorMessage(error),
      );
    }
  }

  if (!text && openRouterKey && images.length === 0) {
    text =
      (await callOpenRouter(
        prompt,
        history,
        openRouterKey,
        clientDate,
        clientTime,
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
