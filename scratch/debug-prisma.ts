import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const keys = Object.keys(prisma);
console.log('Prisma Client Keys:', keys);
console.log('mealPlan exists:', 'mealPlan' in prisma);
async function main() {
    try {
        const count = await (prisma as any).mealPlan.count();
        console.log('mealPlan count works:', count);
    } catch (e) {
        console.error('mealPlan access failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
