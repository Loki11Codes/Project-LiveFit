# 🛠️ Developer Setup Guide

Welcome to the **Project-LiveFit** codebase! This project is a modern Next.js application with a Prisma-backed local database. Use the following steps to get the project running on your local machine.

## 📋 Prerequisites

Ensure you have the following installed:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: For version control

---

## 🚀 Quick Start

Follow these steps in order:

### 1. Clone the Repository
```bash
git clone https://github.com/Loki11Codes/Project-LiveFit.git
cd Project-LiveFit
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the example environment file and fill in your details:
```bash
cp .env.example .env
```
> [!IMPORTANT]
> You **must** provide a `GEMINI_API_KEY` in the `.env` file for the AI chat features to work. You can get one from the [Google AI Studio](https://aistudio.google.com/).

### 4. Initialize the Database
Since the local database file is ignored by Git, you need to create it locally and run migrations:
```bash
npx prisma migrate dev
```
This will:
- Create the local `dev.db` file.
- Apply the current database schema.
- Generate the Prisma Client for type-safe queries.

### 5. Start the Development Server
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

- `/src/components`: UI components (including the intelligent `Chat.tsx`).
- `/src/app`: Next.js App Router pages and API routes.
- `/prisma`: Database schema and migration history.
- `/public`: Static assets (images, fonts).

---

## 🛠️ Development Workflow

- **Branching**: Always create a new branch for features (`git checkout -b feature/your-feature`).
- **Commits**: Use descriptive commit messages.
- **Pulling**: Always use `git pull origin main --rebase` to avoid merge bubbles.
- **Database Changes**: If you modify `prisma/schema.prisma`, run `npx prisma migrate dev` to apply changes.

---

## 🐛 Troubleshooting

- **"Cannot find name 'chatEndRef'"**: This usually implies a missing ref initialization in `Chat.tsx`.
- **Gemini Errors**: Check that your `GEMINI_API_KEY` is valid and has sufficient quota.
- **Port 3000 in use**: Run `npx kill-port 3000` or change the port in `package.json`.

---

Happy Coding! 🏋️
