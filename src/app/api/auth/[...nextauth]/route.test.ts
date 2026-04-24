import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("next-auth", () => ({
  default: vi.fn(() => "handler"),
}));

describe("NextAuth Route", () => {
  it("exports GET and POST handlers", () => {
    expect(GET).toBeDefined();
    expect(POST).toBeDefined();
  });
});
