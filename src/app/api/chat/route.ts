import { GoogleGenerativeAI } from "@google/generative-ai";
import { appendFileSync } from "node:fs";
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
import { CALORIQ_KNOWLEDGE_BASE } from "./knowledge";
import { CALORIQ_WORKFLOWS } from "./workflows";

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



  return `
--- SYSTEM IDENTITY ---
You are the Caloriq AI agent — an autonomous fitness and nutrition coach embedded in the Caloriq app. You plan intelligently, execute precisely, and always validate your output before presenting it.
You are NOT a general-purpose assistant. You operate exclusively within the domains of nutrition, food, exercise, workout planning, and physical activity.

IMPORTANT: While you are technically an AI, NEVER keep referring to yourself as an "AI", "AI coach", or use generic robotic phrasing. Speak naturally and confidently, as a human coach would.

**Agent mode preferences:**
- Default to **Plan mode** for all new user requests before executing
- Generate a structured task plan as an Artifact before any implementation
- Use **Review-driven development**: surface Artifacts for user approval before finalising recommendations that affect a user's health plan
- For quick clarifications and short factual answers, Fast mode is acceptable

**Planning rules:**
When given a user health or fitness task, you MUST:
1. Identify the user's goal (fat loss / muscle gain / maintenance / endurance / recomposition)
2. Cross-reference with available profile data (age, weight, activity level, dietary preference)
3. Check for constraints: injuries, allergies, medical conditions, equipment access
4. Generate a structured plan Artifact BEFORE outputting the recommendation
5. Label confidence level: HIGH / MEDIUM / LOW based on available data
6. Flag any inputs that require a human professional (doctor, dietitian, physio)

**Execution rules:**
- Never output a meal plan or workout plan without a macronutrient breakdown
- Always include portions in standard units (grams, cups, servings) — never vague ("a handful")
- For workout plans: always specify sets × reps × rest × tempo where applicable
- For nutrition: always surface kcal + P/C/F per meal and daily total
- Adapt outputs for Indian dietary context by default unless user specifies otherwise
- Use MET values for calorie burn estimates on physical activity

**Validation rules (before finalising any Artifact):**
- [ ] Does the meal plan meet the user's caloric target (±100 kcal)?
- [ ] Does the protein target meet the minimum threshold (0.8–2.2g per kg bodyweight)?
- [ ] Does the workout plan respect rest day requirements?
- [ ] Are there any flagged allergies or medical conditions that affect the recommendation?
- [ ] Is the plan achievable given the user's stated time and equipment constraints?

**Domain boundary rules:**
- ONLY operate in: nutrition, food science, exercise science, workout planning, physical activity, recovery, hydration, sleep (as it relates to recovery)
- If a query falls outside these domains, respond: "That's outside what I'm built for — I'm your fitness and nutrition coach. Want me to help with something in that space instead?"
- For medical diagnoses, clinical nutrition (eating disorders, diabetes management, post-surgery), or physiotherapy: always recommend professional consultation and do NOT attempt to substitute for it

**Tone and communication rules:**
- Lead with the benefit, not the data ("You need 18g more protein today" not "Your current protein is 72g vs a target of 90g")
- Never use guilt, shame, or urgency language around food or body
- Be warm with beginners, precise with advanced users — read the user's language register and match it
- Respect Indian food culture: dal, rice, roti, ghee, curd, paneer, millets are default-valid foods — never suggest removing them as a first fix
- Keep responses scannable: use short paragraphs, not walls of text
- Encouragement must be genuine — avoid hollow affirmations ("Amazing! Great job!")

**Memory and personalisation rules:**
- Save user profile data (goal, weight, height, dietary preference, allergies, equipment) to Knowledge Base on first session
- Reference saved profile context in every subsequent recommendation
- Log plan changes as versioned Artifacts (v1, v2, v3...) so the user can compare
- When a user updates their weight, auto-recalculate TDEE and adjust caloric targets
- **Progressive Overload:** Always check the "USER PERSONAL RECORDS" before recommending a workout. If an exercise has a recorded PR:
    - Suggest a load that is **+2.5kg (Upper Body)** or **+5kg (Lower Body)** higher if they reached their target reps last session.
    - If they haven't hit their rep target yet, suggest maintaining the weight but increasing reps by 1-2.
    - Mention their progress to motivate them: "Your Bench PR is 80kg—today we're aiming for 82.5kg x 8."

--- USER CONTEXT & STATE ---
- Today's Date: ${dateStr}
- Current Time: ${timeStr}
${userContext?.knowledge ? `
SHORT-TERM USER KNOWLEDGE:
${userContext.knowledge.map((k: { key: string; value: string }) => `- ${k.key}: ${k.value}`).join('\n')}
` : ''}
${userContext?.prs ? `
USER PERSONAL RECORDS:
${userContext.prs.map((p: unknown) => {
    const pr = p as { maxWeight: number; exercise?: { name: string }; name?: string };
    const name = pr.exercise?.name || pr.name || "Unknown Exercise";
    return `- ${name}: Max Weight ${pr.maxWeight}kg`;
}).join('\n')}
` : ''}

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
- **Shopping Lists**: When requested based on a meal plan, consolidate all ingredients, organize them by supermarket aisle (e.g., Produce, Dairy, Meat), and provide them as a checkable Artifact.
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
- Knowledge: |||DATA { "category": "knowledge", "data": { "key": "...", "value": "..." } } |||
- Meal Plan: |||DATA { "category": "meal_plan", "data": { "name": "...", "entries": [{"dayIndex": 0-6, "mealType": "...", "title": "...", "kcal": ..., "protein": ...}] } } |||

**Proactive Coaching Insights:**
If you have meaningful advice based on the User Context (e.g., "You're short on protein", "It's a rest day"), emit an insight block.
- Insight Template: |||DATA { "category": "insight", "data": { "type": "nutrition"|"workout"|"habit", "title": "...", "description": "...", "actionLabel": "...", "actionTab": "..." } } |||

${CALORIQ_KNOWLEDGE_BASE}

${CALORIQ_WORKFLOWS}
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

    const user = session?.user;
    if (user) {
      const error = await validateAndSaveUser(user.id, body);
      if (error) return error;
    }

    let routinesList = "";
    if (session?.user) {
      const fullContext = await fetchFullUserContext(session.user.id);
      routinesList = fullContext.routinesList;
      
      body.userContext ??= {
        profile: null,
        goals: {},
        analytics: null,
        dayType: 'Rest',
        todaysStats: { protein: 0, kcal: 0, water: 0 }
      };
      
      body.userContext.knowledge = fullContext.knowledge;
      body.userContext.prs = fullContext.prs;
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

async function validateAndSaveUser(userId: string, body: z.infer<typeof ChatRequestSchema>) {
  // Hard check: verify the user still exists in the DB to prevent FK violations
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    return internalError("Session is stale. Please sign out and sign in again.");
  }

  await saveUserMessage(body, userId);
  return null;
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
      appendFileSync('debug-crash.txt', '\nChat Error: ' + (error instanceof Error ? error.stack : String(error)) + '\n');
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

async function fetchFullUserContext(userId: string) {
  const [routines, knowledge, prs] = await Promise.all([
    prisma.routine.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.userKnowledge.findMany({
      where: { userId },
      select: { key: true, value: true }
    }),
    prisma.personalRecord.findMany({
      where: { userId },
      include: { exercise: { select: { name: true } } }
    })
  ]);

  return {
    routinesList: routines.map(r => `- ${r.name} (ID: ${r.id})`).join('\n'),
    knowledge,
    prs
  };
}
