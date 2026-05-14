import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      user: { findUnique: vi.fn() },
      userProfile: { findUnique: vi.fn() },
      goal: { findUnique: vi.fn() },
      bodyMeasurement: { findMany: vi.fn() },
      foodLog: { findMany: vi.fn() },
      workoutLog: { findMany: vi.fn() },
      sleepLog: { findMany: vi.fn() },
      userKnowledge: { findMany: vi.fn() },
      dayTypeEntry: { findMany: vi.fn() },
      routine: { findMany: vi.fn() },
      mealPlan: { findMany: vi.fn() },
      personalRecord: { findMany: vi.fn() },
      achievement: { findMany: vi.fn() },
    },
  };
});

describe("Export API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns a JSON file with all user data if authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "test-user-id" },
      expires: "1",
    });

    const mockUserData = { id: "test-user-id", name: "Test" };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserData as any);
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({ userId: "test-user-id", age: 30 } as any);
    vi.mocked(prisma.goal.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.bodyMeasurement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.foodLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.workoutLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sleepLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userKnowledge.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dayTypeEntry.findMany).mockResolvedValue([]);
    vi.mocked(prisma.routine.findMany).mockResolvedValue([]);
    vi.mocked(prisma.mealPlan.findMany).mockResolvedValue([]);
    vi.mocked(prisma.personalRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);

    const headers = res.headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Content-Disposition")).toBe('attachment; filename="caloriq-export.json"');

    const data = await res.json();
    expect(data.user).toEqual(mockUserData);
    expect(data.profile).toEqual({ userId: "test-user-id", age: 30 });
    expect(data.workoutLogs).toEqual([]);
    
    // Assert prisma was called with the correct ID
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "test-user-id" } }));
    expect(prisma.workoutLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "test-user-id" } }));
  });

  it("returns 500 if database fails", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "test-user-id" },
      expires: "1",
    });

    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB Error"));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to export data");
  });
});
