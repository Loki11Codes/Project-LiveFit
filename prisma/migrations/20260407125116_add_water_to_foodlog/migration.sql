/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FoodLog" ADD COLUMN "water" REAL;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "carbsTarget" REAL;
ALTER TABLE "Goal" ADD COLUMN "fatsTarget" REAL;
ALTER TABLE "Goal" ADD COLUMN "workoutDuration" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "equipment" TEXT
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoutineExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routineId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "customName" TEXT,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetReps" TEXT,
    CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutLogId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "customName" TEXT,
    "order" INTEGER NOT NULL,
    CONSTRAINT "WorkoutExercise_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight" REAL,
    "distance" REAL,
    "duration" INTEGER,
    "isWarmup" BOOLEAN NOT NULL DEFAULT false,
    "isDrop" BOOLEAN NOT NULL DEFAULT false,
    "isFailure" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WorkoutSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "height" REAL,
    "startDay" INTEGER,
    "primaryGoal" TEXT,
    "dietaryPreference" TEXT,
    "activityPreference" TEXT,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "hapticFeedback" BOOLEAN NOT NULL DEFAULT true,
    "workoutReminders" BOOLEAN NOT NULL DEFAULT true,
    "mealLogging" BOOLEAN NOT NULL DEFAULT false,
    "waterCheckIns" BOOLEAN NOT NULL DEFAULT true,
    "day1" TEXT,
    "day2" TEXT,
    "day3" TEXT,
    "day4" TEXT,
    "day5" TEXT,
    "day6" TEXT,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserProfile" ("age", "day1", "day2", "day3", "day4", "day5", "day6", "gender", "height", "id", "primaryGoal", "startDay", "userId") SELECT "age", "day1", "day2", "day3", "day4", "day5", "day6", "gender", "height", "id", "primaryGoal", "startDay", "userId" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE TABLE "new_WorkoutLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "volume" REAL,
    "details" TEXT,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "routineId" TEXT,
    CONSTRAINT "WorkoutLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutLog_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutLog" ("details", "focus", "id", "time", "userId", "volume") SELECT "details", "focus", "id", "time", "userId", "volume" FROM "WorkoutLog";
DROP TABLE "WorkoutLog";
ALTER TABLE "new_WorkoutLog" RENAME TO "WorkoutLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
