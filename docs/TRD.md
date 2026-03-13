# Technical Requirements Document (TRD) - Project LiveFit

## 1. Functional Requirements
- **FR1**: AI must parse food items and return: Protein (g), Calories (kcal), Carbs (g), Fats (g), Fiber (g).
- **FR2**: AI must parse workout entries and return: Focus area, Volume (kg), and PRs.
- **FR3**: System must store historical data for nutrition, workouts, sleep, and body measurements.
- **FR4**: Users must be able to set and save daily targets for different day types.
- **FR5**: Light/Dark mode state must persist across sessions.

## 2. Non-Functional Requirements
- **NFR1**: Low Latency - AI parsing results should appear within 2 seconds.
- **NFR2**: Scalability - The architecture should support multiple concurrent users (though initially focused on local/single user).
- **NFR3**: Reliability - Local storage or database should ensure no data loss on refresh.
- **NFR4**: Accessibility - UI should follow standard WCAG guidelines for contrast and readability.

## 3. API Specifications
### AI Parsing Specification (Gemini)
- **Endpoint**: `/api/parse`
- **Input**: `{ prompt: string, context: UserContext }`
- **Output**:
```json
{
  "category": "food" | "workout" | "sleep" | "measurement",
  "data": { ... },
  "formattedMessage": "string"
}
```

## 4. Database Schema (Prisma)
```prisma
model User {
  id        String   @id @default(cuid())
  name      String?
  logs      Log[]
  settings  Settings?
}

model Log {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @default(now())
  type      String   // food, workout, sleep, measurement
  content   String   // JSON stringified data
}
```
