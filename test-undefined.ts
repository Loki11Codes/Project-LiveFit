import prisma from './src/lib/prisma';

async function test() {
  try {
    await prisma.foodLog.create({
      data: {
        userId: undefined, // undefined passed dynamically?? NO, typescript prevents undefined for required fields unless we use `as any` or something bypasses it. Actually, wait.
        // Wait, if it's undefined, it's missing at runtime.
        name: "Test",
        protein: 0,
        kcal: 0
      } as any
    });
    console.log("Success?");
  } catch (e) {
    console.error("Crash!", e);
  }
}
test().catch(console.error);
