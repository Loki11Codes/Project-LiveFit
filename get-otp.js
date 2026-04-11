const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getOtp() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email');
    process.exit(1);
  }

  const token = await prisma.verificationToken.findFirst({
    where: { identifier: `otp:${email}` },
    orderBy: { expires: 'desc' }
  });

  if (token) {
    console.log(`OTP_CODE_FOUND: ${token.token}`);
  } else {
    console.log('OTP_CODE_NOT_FOUND');
  }
  process.exit(0);
}

getOtp();
