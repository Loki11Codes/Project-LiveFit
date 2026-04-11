import process from 'node:process';
import { extractAndCleanLogData } from './src/lib/chat-utils';
import { persistLogData } from './src/lib/persistence';
import prisma from './src/lib/prisma';

async function test() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user");

  const promptText = `
Great! I've logged your apple (95 kcal, 25g carbs, 4.4g fiber). Keep up the healthy snacking! 🍎
|||DATA
{
  "category": "food",
  "items": [
    { "name": "Apple", "kcal": 95, "protein": 0, "carbs": 25, "fiber": 4.4, "fats": 0 }
  ]
}
|||
  `;

  console.log("Mocking for userId:", user.id);
  const { logs, cleanText } = extractAndCleanLogData(promptText);
  console.log("Extracted logs:", JSON.stringify(logs));

  try {
    await persistLogData(logs, user.id, "2026-04-03");
    console.log("Persistence successful!");
    
    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "model",
        text: cleanText,
        images: null,
      },
    });
    console.log("Chat Message successful!");
  } catch (e) {
    console.error("Crash!", e);
  }
}

test().finally(() => process.exit(0));
