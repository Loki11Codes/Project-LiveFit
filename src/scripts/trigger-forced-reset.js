const { PrismaClient } = require("@prisma/client");

/**
 * TRIGGER FORCED RESET SCRIPT
 * 
 * This script flags all existing users who have a password set
 * to mandatorily reset their password to the new 12-character standard.
 */
async function main() {
  const prisma = new PrismaClient();
  
  console.log("Starting forced password reset flagging...");

  try {
    const result = await prisma.user.updateMany({
      where: {
        password: { not: null },
        requirePasswordChange: false,
      },
      data: {
        requirePasswordChange: true,
      },
    });

    console.log(`Successfully flagged ${result.count} users for mandatory password reset.`);
  } catch (error) {
    console.error("Error flagging users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
