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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.requirePasswordChange = user.requirePasswordChange;
      }

      // Handle session update to clear security flag without logout
      if (trigger === "update" && session) {
        token.requirePasswordChange = session.requirePasswordChange;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        // Verify user still exists in database to prevent foreign key errors with stale JWTs
        const userExists = await prisma.user.findUnique({
          where: { id: token.id },
          select: { id: true }
        });
        
        if (!userExists) {
          // If the user was deleted from the database but the JWT remains,
          // invalidate the session to force them to sign out/in again.
          throw new Error("Session invalidated: User no longer exists in the database.");
        }
        
        session.user.id = token.id;
        session.user.requirePasswordChange = token.requirePasswordChange;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
