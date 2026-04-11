import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      requirePasswordChange?: boolean;
      onboarded?: boolean;
      hasSeenTutorial?: boolean;
      emailVerified?: Date | null;
    };
  }

  interface User {
    id: string;
    requirePasswordChange?: boolean;
    onboarded?: boolean;
    hasSeenTutorial?: boolean;
    emailVerified?: Date | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    requirePasswordChange?: boolean;
    onboarded?: boolean;
    hasSeenTutorial?: boolean;
    emailVerified?: Date | null;
  }
}
