import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

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

export async function POST(req: Request) {
  try {
    const { prompt, history } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...history,
        { role: 'user', parts: [{ text: prompt }] },
      ],
    });

    const response = result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Chat Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
