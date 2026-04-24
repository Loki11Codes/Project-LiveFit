import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Providers } from "./Providers";
import React from "react";

// Mock dependencies
vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="session-provider">{children}</div>,
}));

vi.mock("@/components/Theme/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
}));

vi.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

describe("Providers Component", () => {
  it("renders all providers and children", () => {
    render(
      <Providers>
        <div data-testid="child">Child Content</div>
      </Providers>
    );

    expect(screen.getByTestId("session-provider")).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("Child Content");
  });
});
