import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
You are the LiveFit AI — a concise fitness tracking assistant. 
Your goal is to parse user messages into structured log data.

NUTRITION REFERENCE:
- Egg (large): 7g protein, 70kcal, 0g carb, 5g fat, 0g fiber
- Milk (100ml): 3.1g protein, 58kcal, 4.7g carb, 3.2g fat, 0g fiber
- Paneer (100g): 18g protein, 265kcal, 4g carb, 20g fat, 0g fiber
- Dal cooked (100g): 9g protein, 116kcal, 20g carb, 0.4g fat, 4g fiber
- Rice cooked (100g): 2.7g protein, 130kcal, 28g carb, 0.3g fat, 0.4g fiber
- Chapati (1): 3g protein, 120kcal, 20g carb, 3g fat, 2g fiber

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

async function callGemini(prompt: string, history: any[]) {
  console.log('Using Gemini...');
  const modelsToTry = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-preview',
    'gemini-3-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
  let lastError = null;

  for (const modelId of modelsToTry) {
    try {
      console.log(`Trying Gemini model: ${modelId}...`);
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          ...history,
          { role: 'user', parts: [{ text: prompt }] },
        ],
      });
      console.log(`Success with Gemini model: ${modelId}`);
      return result.response.text();
    } catch (e: any) {
      console.warn(`Gemini model ${modelId} failed:`, e.message || e);
      lastError = e;
      if (e.message?.includes('404') || e.message?.includes('not found')) {
        continue;
      }
      continue;
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

async function callOpenRouter(prompt: string, history: any[], openRouterKey: string) {
  console.log('Using OpenRouter...');
  
  const freeModels = [
    "openrouter/free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-7b-instruct:free"
  ];

  for (const modelId of freeModels) {
    try {
      console.log(`Trying OpenRouter model: ${modelId}...`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "LiveFit App",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.map((h: any) => ({
              role: h.role === 'model' ? 'assistant' : 'user',
              content: h.parts[0].text
            })),
            { role: "user", content: prompt }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.choices?.[0]?.message?.content) {
          console.log(`Success with model: ${modelId}`);
          return data.choices[0].message.content;
        }
      } else {
        const errorText = await res.text();
        console.warn(`OpenRouter model ${modelId} failed: ${res.status} - ${errorText}`);
      }
    } catch (e) {
      console.error(`Error with model ${modelId}:`, e);
    }
  }
  return null;
}

async function persistLogData(text: string, userId: string) {
  try {
    const dataRegex = /\|\|\|DATA\s*([\s\S]*?)\|\|\|/g;
    const match = dataRegex.exec(text);
    if (match) {
      const parsed = JSON.parse(match[1]);

      if (parsed.category === 'food' && parsed.data?.items) {
        console.log('Saving food logs...');
        await Promise.all(parsed.data.items.map((item: any) => 
          prisma.foodLog.create({
            data: {
              userId,
              name: item.name,
              kcal: item.kcal,
              protein: item.protein,
              carbs: item.carbs,
              fats: item.fats,
              fiber: item.fiber,
            }
          })
        ));
      } else if (parsed.category === 'workout') {
        console.log('Saving workout log...');
        await prisma.workoutLog.create({
          data: {
            userId,
            focus: parsed.data.focus,
            volume: parsed.data.volume,
            details: JSON.stringify(parsed.data.prs || {}),
          }
        });
      } else if (parsed.category === 'sleep') {
        console.log('Saving sleep log...');
        await prisma.sleepLog.create({
          data: {
            userId,
            hours: parsed.data.hours,
            bedTime: parsed.data.bed,
            wakeTime: parsed.data.wake,
          }
        });
      } else if (parsed.category === 'measurement') {
        console.log('Saving body measurement...');
        await prisma.bodyMeasurement.create({
          data: {
            userId,
            weight: parsed.data.weight,
            waist: parsed.data.waist,
            chest: parsed.data.chest,
            arms: parsed.data.arms,
            thighs: parsed.data.thighs,
            hips: parsed.data.hips,
          }
        });
      }
    }
  } catch (dbError) {
    console.error('Failed to save to database:', dbError);
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, history } = await req.json();
    const session = await getServerSession(authOptions);
    
    console.log('--- Chat Request ---');
    console.log('User:', session?.user?.email || 'Guest');

    const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' && process.env.GEMINI_API_KEY.trim() !== '' ? process.env.GEMINI_API_KEY : null;
    const openRouterKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here' && process.env.OPENROUTER_API_KEY.trim() !== '' ? process.env.OPENROUTER_API_KEY : null;

    if (!geminiKey && !openRouterKey) {
      return NextResponse.json({ error: 'No valid AI API Key provided' }, { status: 500 });
    }

    let text = '';

    if (geminiKey) {
      try {
        text = await callGemini(prompt, history);
      } catch (e) {
        console.error('Gemini failed completely, failing over to OpenRouter...', e);
      }
    }

    if (!text && openRouterKey) {
      text = await callOpenRouter(prompt, history, openRouterKey) || '';
    }

    if (!text) {
      throw new Error('All AI providers failed');
    }

    if (session?.user) {
      await persistLogData(text, (session.user as any).id);
    }

    console.log('AI Response:', text.substring(0, 50) + '...');
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Chat Route Error:', error.message || error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
