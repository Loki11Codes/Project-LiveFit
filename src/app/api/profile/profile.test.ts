import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const models = {
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    goal: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
    bodyMeasurement: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
  return {
    default: {
      ...models,
      $transaction: vi.fn((cb: (tx: typeof models) => Promise<unknown>) => cb(models)),
    },
  };
});

describe("Profile API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 if not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new Request("http://localhost/api/profile");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns profile data for authenticated user", async () => {
      const mockSession = { user: { id: "user-1", email: "test@example.com" } };
      vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as Session);

      const mockProfile = { userId: "user-1", age: 30, gender: "Male" };
      const mockUser = {
        name: "Test User",
        email: "test@example.com",
        phone: null,
        username: null,
      };
      vi.mocked(prisma.userProfile.findUnique).mockResolvedValue(
        mockProfile as unknown as Awaited<ReturnType<typeof prisma.userProfile.findUnique>>,
      );  
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      const req = new Request("http://localhost/api/profile");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ ...mockProfile, ...mockUser, achievements: [], provider: "credentials" });
      expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        include: { achievements: true },
      });
    });

    it("returns goal data when type=goals is requested", async () => {
      const mockUser = { id: "user-1" };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

      const mockGoal = { userId: "user-1", proteinTarget: 150 };
      vi.mocked(prisma.goal.findUnique).mockResolvedValue(mockGoal as unknown as Awaited<ReturnType<typeof prisma.goal.findUnique>>);  

      const req = new Request("http://localhost/api/profile?type=goals");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockGoal);
      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  describe("POST", () => {
    it("returns 401 if not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new Request("http://localhost/api/profile", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("updates profile data", async () => {
      const mockUser = { id: "user-1" };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

      const updateData = { age: 31, gender: "Male", name: "New Name" };
      vi.mocked(prisma.userProfile.upsert).mockResolvedValue({
        userId: "user-1",
        ...updateData,
      } as unknown as Awaited<ReturnType<typeof prisma.userProfile.upsert>>);  

      const req = new Request("http://localhost/api/profile", {
        method: "POST",
        body: JSON.stringify(updateData),
      });
      const res = await POST(req);
      await res.json();

      expect(res.status).toBe(200);
      expect(prisma.userProfile.upsert).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { name: "New Name" },
      });
    });

    it("updates goal data if goal fields are present", async () => {
      const mockUser = { id: "user-1" };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

      const goalData = { proteinTarget: 180, kcalTarget: 2500 };
      vi.mocked(prisma.goal.upsert).mockResolvedValue({
        userId: "user-1",
        ...goalData,
      } as unknown as Awaited<ReturnType<typeof prisma.goal.upsert>>);  

      const req = new Request("http://localhost/api/profile", {
        method: "POST",
        body: JSON.stringify(goalData),
      });
      const res = await POST(req);
      await res.json();

      expect(res.status).toBe(200);
      expect(prisma.goal.upsert).toHaveBeenCalled();
    });

    it("returns 400 for invalid profile data", async () => {
      const mockUser = { id: "user-1" };
      vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

      const invalidData = { age: "invalid" }; // age should be number (forced by schema)
      const req = new Request("http://localhost/api/profile", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty("error");
    });

    it("returns 400 for invalid goal data in POST", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
      const res = await POST(
        new Request("http://localhost/api/profile", {
          method: "POST",
          body: JSON.stringify({ proteinTarget: -10 }),
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 500 if database fails on GET", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(prisma.userProfile.findUnique).mockRejectedValueOnce(
        new Error("DB Error"),
      );
      const res = await GET(new Request("http://localhost/api/profile"));
      expect(res.status).toBe(500);
    });

    it("returns 500 if database fails on POST", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(prisma.userProfile.upsert).mockRejectedValueOnce(
        new Error("DB Error"),
      );
      const res = await POST(
        new Request("http://localhost/api/profile", {
          method: "POST",
          body: JSON.stringify({ age: 30 }),
        }),
      );
      expect(res.status).toBe(500);
    });

    it("handles partial user updates in profile POST", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
      
      // name only
      await POST(new Request("http://localhost/api/profile", {
        method: "POST",
        body: JSON.stringify({ name: "Only Name" }),
      }));
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: "Only Name" } }));

      // phone only
      await POST(new Request("http://localhost/api/profile", {
        method: "POST",
        body: JSON.stringify({ phone: "+16502530000" }),
      }));
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { phone: "+16502530000" } }));

      // username only
      await POST(new Request("http://localhost/api/profile", {
        method: "POST",
        body: JSON.stringify({ username: "user" }),
      }));
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { username: "user" } }));

      // none
      vi.mocked(prisma.user.update).mockClear();
      await POST(new Request("http://localhost/api/profile", {
        method: "POST",
        body: JSON.stringify({ age: 30 }),
      }));
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("returns empty object if goal is missing in GET", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(prisma.goal.findUnique).mockResolvedValue(null);
      const res = await GET(new Request("http://localhost/api/profile?type=goals"));
      const data = await res.json();
      expect(data).toEqual({});
    });

    it("handles non-Error exceptions in GET", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(prisma.userProfile.findUnique).mockRejectedValueOnce("string error");
      const res = await GET(new Request("http://localhost/api/profile"));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("Unknown error");
    });
  });
});



