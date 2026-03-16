import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { conflict, internalError, parseJsonBody } from '@/lib/api';
import { SignupSchema } from '@/lib/validation';

export async function POST(req: Request) {
  const parsedBody = await parseJsonBody(req, SignupSchema);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const { name, email, password } = parsedBody.data;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return conflict('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ message: 'User created successfully', user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Signup error:', error);
    return internalError('Unable to create your account right now');
  }
}
