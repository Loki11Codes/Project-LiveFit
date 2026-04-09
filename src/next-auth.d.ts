import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      requirePasswordChange?: boolean;
    };
  }

  interface User {
    id: string;
    requirePasswordChange?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    requirePasswordChange?: boolean;
  }
}
