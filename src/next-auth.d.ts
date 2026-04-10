import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      requirePasswordChange?: boolean;
      onboarded?: boolean;
      hasSeenTutorial?: boolean;
    };
  }

  interface User {
    id: string;
    requirePasswordChange?: boolean;
    onboarded?: boolean;
    hasSeenTutorial?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    requirePasswordChange?: boolean;
    onboarded?: boolean;
    hasSeenTutorial?: boolean;
  }
}
