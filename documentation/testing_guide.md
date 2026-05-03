# Caloriq Testing & Quality Assurance Guide

This document outlines the standard procedures for testing and maintaining the Caloriq application.

## 1. Development & Local Testing

Before pushing any changes, ensure your local environment is clean and all dependencies are up to date.

### Core Commands
- **Install Dependencies**: `npm install`
- **Prisma Client Generation**: `npx prisma generate`
- **Database Sync**: `npx prisma db push` (Use `--force-reset` only if you want to wipe local data)
- **Start Dev Server**: `npm run dev`

### Static Analysis
- **Linting**: `npm run lint`
- **Type Checking**: `npx tsc --noEmit`

## 2. Automated Test Suite

We use **Vitest** for component and unit testing.

### Running Tests
- **Run all tests**: `npm test`
- **Run in watch mode**: `npx vitest`
- **Run specific file**: `npx vitest path/to/file.test.tsx`
- **Coverage report**: `npm test -- --coverage`

### Test Structure
- **Unit Tests**: Located alongside source files (e.g., `src/lib/*.test.ts`).
- **Component Tests**: Located in the same directory as components (e.g., `src/components/**/*.test.tsx`).
- **Mocks**: Most external services (Prisma, NextAuth, Fetch) are mocked in `src/test/setup.ts` or within individual test files.

## 3. Authentication Verification

Authentication is the most critical part of the application. Always verify the following flows:
1. **Credentials Login**: Test with a valid user and an invalid password.
2. **Google OAuth**: Ensure the redirect flow works and user flags (`onboarded`) are correctly initialized.
3. **Session Persistence**: Verify that refreshing the page maintains the user state.
4. **Onboarding Guard**: New users MUST be redirected to `/onboarding`.
5. **Security Guards**: Users flagged for `requirePasswordChange` MUST be redirected to `/auth/reset-password`.

## 4. Production Deployment Checklist

When deploying to Vercel or similar platforms:
1. Ensure all Environment Variables are set (`DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, etc.).
2. Run `npm run build` locally to catch any build-time errors.
3. Verify that the `prisma generate` command is part of the `postinstall` script.
4. Run a final manual pass on the live site using a fresh incognito window.
