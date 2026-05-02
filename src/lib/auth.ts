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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.requirePasswordChange = user.requirePasswordChange;
        token.onboarded = user.onboarded;
        token.hasSeenTutorial = user.hasSeenTutorial;
        token.emailVerified = user.emailVerified;
      }

      // If logging in via Google, always ensure emailVerified is set in the token
      if (account?.provider === "google") {
        token.emailVerified = token.emailVerified || new Date();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.requirePasswordChange = token.requirePasswordChange as boolean;
        session.user.onboarded = token.onboarded as boolean;
        session.user.hasSeenTutorial = token.hasSeenTutorial as boolean;
        session.user.emailVerified = token.emailVerified as Date | null;
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
