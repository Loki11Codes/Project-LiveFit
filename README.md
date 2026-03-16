# LiveFit

LiveFit is an AI-assisted fitness tracker built with Next.js, Prisma, and NextAuth.
It lets a signed-in user log food, workouts, sleep, and body measurements through
chat, then stores the structured data in a local SQLite database.

## What It Does

- Natural-language logging for food, workouts, sleep, and measurements
- Image upload in chat for nutrition labels and food-photo analysis
- Structured persistence for food logs, workout logs, sleep logs, body measurements, and goals
- Daily dashboard totals for protein, calories, carbs, fats, and fiber
- History table built from saved logs
- Body measurement form plus latest measurement snapshot
- Profile page with credentials/Google auth and daily goal management
- Analytics API for 7-day nutrition and weight-trend data

## Tech Stack

- Next.js 16 App Router
- React 19
- Prisma + SQLite
- NextAuth.js with Google and credentials providers
- Gemini API for primary AI parsing and image analysis
- OpenRouter fallback for text-only chat when configured
- Tailwind CSS 4 + custom global CSS
- TypeScript + Zod

## Current Status

Implemented now:

- Chat-based structured logging
- Image attachments in chat
- Database persistence for food, workouts, sleep, measurements, and goals
- Typed dashboard aggregation and history generation
- Auth-gated dashboard

Still incomplete:

- Analytics UI is not yet exposed in the frontend
- Day type is not stored historically, so old history rows do not retain Rest/Training/Lite
- README was refreshed, but `.env.example` still does not list every optional auth/provider variable
- Local production builds can fail if a running dev server is holding `.next` open

## Authentication

The dashboard routes are protected by middleware in
[`src/proxy.ts`](./src/proxy.ts). Users can sign in with:

- Email + password credentials
- Google OAuth

The app uses JWT sessions with Prisma-backed user/account data.

## Data Model

Prisma models live in [`prisma/schema.prisma`](./prisma/schema.prisma).

Main app entities:

- `FoodLog`
- `WorkoutLog`
- `SleepLog`
- `BodyMeasurement`
- `Goal`
- `User`, `Account`, `Session`, `VerificationToken` for auth

## API Surface

App routes currently implemented:

- `POST /api/chat`: AI parsing, image analysis, and log persistence
- `GET /api/logs`: fetch food, workout, and sleep logs
- `GET /api/measurements`: fetch latest body measurement
- `POST /api/measurements`: create a body measurement
- `GET /api/goals`: fetch current daily goals
- `POST /api/goals`: upsert daily goals
- `GET /api/analytics`: 7-day nutrition averages and weight trend
- `POST /api/auth/signup`: create a credentials user

## Project Structure

```text
.
|- prisma/
|  |- migrations/
|  `- schema.prisma
|- public/
|- src/
|  |- app/
|  |  |- api/
|  |  |- auth/
|  |  |- globals.css
|  |  |- layout.tsx
|  |  `- page.tsx
|  |- components/
|  |  |- Tabs/
|  |  |- Chat.tsx
|  |  |- Navbar.tsx
|  |  `- Sidebar.tsx
|  |- lib/
|  |  |- auth.ts
|  |  |- dashboard.ts
|  |  |- prisma.ts
|  |  |- types.ts
|  |  `- validation.ts
|  `- proxy.ts
|- README.md
`- SETUP.md
```

## Setup

Use [`SETUP.md`](./SETUP.md) for the full local setup guide.

Quick version:

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

## Environment Variables

Minimum local setup:

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=your_gemini_api_key_here
NEXTAUTH_SECRET=replace_me
```

Optional:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Notes:

- Image analysis currently requires `GEMINI_API_KEY`
- OpenRouter fallback is only used for text chat, not image analysis
- Google login requires both Google OAuth variables plus `NEXTAUTH_SECRET`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Known Limitations

- Chat transcript is not persisted across reloads
- Analytics data exists as an API, but there is no chart UI yet
- Historical rows do not preserve day type
- Image analysis depends on Gemini being configured
- The app currently targets a single-user local SQLite workflow during development

## Troubleshooting

- If `npm run build` fails with `EPERM` on `.next\\trace`, stop any running
  `next dev` process and remove the `.next` directory before retrying.
- If chat fails immediately, check `GEMINI_API_KEY` and optionally `OPENROUTER_API_KEY`.
- If auth fails, verify `NEXTAUTH_SECRET` and any Google OAuth environment variables.
- If Prisma queries fail locally, rerun `npx prisma migrate dev`.

## Next Work

The current implementation backlog is tracked in [`todo.md`](./todo.md).
