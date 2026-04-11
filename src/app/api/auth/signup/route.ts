import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { conflict, internalError, parseJsonBody } from '@/lib/api';
import { SignupSchema } from '@/lib/validation';


export async function POST(req: Request) {
  const result = await parseJsonBody(req, SignupSchema);
  if (!result.success) return result.response;

  const { name, email, password } = result.data;
  const normalizedEmail = email.toLowerCase();

  try {
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
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({ 
      message: 'User created successfully.', 
      user: { id: user.id, email: user.email } 
    });
  } catch (error) {
    console.error('Signup error:', error);
    return internalError('Unable to create your account right now');
  }
}
