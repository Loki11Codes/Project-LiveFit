import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    verificationToken: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(() => Promise.resolve(mockHash)),
  },
}));

const testAuthSecret = "SecurePass123!";
const mismatchSecret = "MismatchPass456!";
const mockHash = "HASHED_DATA_BLOB_01";

describe("Signup API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user with valid data", async () => {
    const payload = {
      name: "Test User",
      email: "test@example.com",
      password: testAuthSecret,
      confirmPassword: testAuthSecret,
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      name: payload.name,
      email: payload.email,
      emailVerified: null,
      image: null,
      password: mockHash,
      username: null,
      phone: null,
    });

    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain("User created");
    expect(bcrypt.hash).toHaveBeenCalledWith(testAuthSecret, 10);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it("returns 409 if email already exists", async () => {
    const payload = {
      name: "Test User",
      email: "existing@example.com",
      password: testAuthSecret,
      confirmPassword: testAuthSecret,
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing",
      name: "Existing User",
      email: payload.email,
      emailVerified: null,
      image: null,
      password: mockHash,
      username: null,
      phone: null,
    });

    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("An account with this email already exists");
  });

  it("returns 400 for invalid data (passwords mismatch)", async () => {
    const payload = {
      name: "Test User",
      email: "test@example.com",
      password: testAuthSecret,
      confirmPassword: mismatchSecret,
    };

    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 if database fails", async () => {
    const payload = {
      name: "Test User",
      email: "test@example.com",
      password: testAuthSecret,
      confirmPassword: testAuthSecret,
    };

    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(
      new Error("DB Error"),
    );

    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

