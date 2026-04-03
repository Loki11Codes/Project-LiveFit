import { persistLogData } from './src/lib/persistence';
import prisma from './src/lib/prisma';

async function test() {
  const userId = "cloauxy6o000008ld2x2x0zqx"; // Wait, I don't know a valid userId.
  
  // Let me fetch the first user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }

  const payload = {
    category: "food",
    items: [
      { name: "Boiled Egg", protein: 14, kcal: 140, date: "2026-04-03" }
    ]
  };

  try {
    await persistLogData([payload], user.id);
    console.log("SUCCESS!");
  } catch (e) {
    console.error("FAILED IMPLOSION:", e);
  }
}

test().finally(() => require('process').exit(0));
