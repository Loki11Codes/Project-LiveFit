import { describe, it, expect, vi } from "vitest";
import { proxy, config } from "./proxy";

vi.mock("next-auth/middleware", () => ({
  withAuth: vi.fn((config) => config),
}));

describe("Proxy Middleware Config", () => {
  it("has correct auth pages configuration", () => {
    // Since proxy is the result of withAuth, and we mocked withAuth to return the config
    // @ts-expect-error Mocked withAuth returns the input config
    expect(proxy.pages.signIn).toBe("/auth/signin");
  });

  it("has correct matcher configuration", () => {
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    // Verify it excludes api, auth, etc.
    const matcher = config.matcher[0];
    expect(matcher).toContain("?!api|auth|_next/static|_next/image|favicon.ico");
  });
});
