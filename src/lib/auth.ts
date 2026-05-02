import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import { getErrorMessage } from '@/lib/dashboard';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {

        
        if (!credentials?.email || !credentials?.password) {
          console.error('Login failed: Missing email or password');
          throw new Error('Please enter both email and password');
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user?.password) {
            console.warn('Login failed: User not found or no password set');
            throw new Error('No user found with this email');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            console.error('Login failed: Invalid password');
            throw new Error('Invalid password');
          }


          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            requirePasswordChange: user.requirePasswordChange,
            onboarded: user.onboarded,
            hasSeenTutorial: user.hasSeenTutorial,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error('Auth check error:', getErrorMessage(error));
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        // Check if user exists before updating (avoids race conditions on first login)
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });

        if (existingUser && !existingUser.emailVerified) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() }
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.requirePasswordChange = user.requirePasswordChange;
        token.onboarded = user.onboarded;
        token.hasSeenTutorial = user.hasSeenTutorial;
        token.emailVerified = user.emailVerified;
      }

      // Special handling for Google: always trust the verification
      if (account?.provider === "google") {
        token.emailVerified = token.emailVerified || new Date();
      }

      // Handle session update
      if (trigger === "update" && session) {
        if (typeof session.requirePasswordChange === 'boolean') {
          token.requirePasswordChange = session.requirePasswordChange;
        }
        if (typeof session.onboarded === 'boolean') {
          token.onboarded = session.onboarded;
        }
        if (typeof session.hasSeenTutorial === 'boolean') {
          token.hasSeenTutorial = session.hasSeenTutorial;
        }
        if (session.emailVerified !== undefined) {
          token.emailVerified = session.emailVerified;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { 
            id: true, 
            requirePasswordChange: true,
            onboarded: true,
            hasSeenTutorial: true,
            emailVerified: true,
            accounts: {
              select: { provider: true }
            }
          }
        });
        
        if (!dbUser) {
          throw new Error("Session invalidated: User no longer exists in the database.");
        }
        
        session.user.id = token.id;
        session.user.requirePasswordChange = dbUser.requirePasswordChange;
        session.user.onboarded = dbUser.onboarded;
        session.user.hasSeenTutorial = dbUser.hasSeenTutorial;
        
        // Final fallback: If DB says not verified but user has a Google account, mark as verified
        const isGoogleUser = dbUser.accounts.some(acc => acc.provider === "google");
        session.user.emailVerified = dbUser.emailVerified || (isGoogleUser ? new Date() : null);
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
