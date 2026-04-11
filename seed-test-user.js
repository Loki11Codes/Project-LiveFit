const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function seedTestUser() {
  const email = 'agent_e2e_verified@example.com';
  const password = await bcrypt.hash('TestPassword123!', 10);

  // Clean up if exists
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      name: 'Agent Verified',
      email: email,
      password: password,
      emailVerified: new Date(),
    }
  });

  console.log(`Successfully created verified user: ${user.email}`);
  process.exit(0);
}

seedTestUser().catch(e => {
  console.error(e);
  process.exit(1);
});
