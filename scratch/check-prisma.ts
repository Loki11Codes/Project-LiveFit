import prisma from '../src/lib/prisma';

async function check() {
  try {
    const plans = await prisma.mealPlan.findMany();
    console.log("MealPlan found, count:", plans.length);
  } catch (e: any) {
    console.error("Error accessing mealPlan:", e.message);
  }
}

check();
