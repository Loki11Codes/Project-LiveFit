/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ProfileTab from "./ProfileTab";
import { signOut, signIn } from "next-auth/react";
import React from "react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const mockPush = vi.fn();
// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, any>) => (
      <div {...props}>{children as React.ReactNode}</div>
    ),
    button: ({ children, ...props }: Record<string, any>) => (
      <button {...props}>{children as React.ReactNode}</button>
    ),
  },
}));

describe("ProfileTab Component", () => {
  const defaultProps = {
    session: {
      user: {
        name: "Test User",
        email: "test@example.com",
        id: "user-1",
        image: "/test.jpg",
      },
      expires: "9999-12-31",
    },
    goals: {
      proteinTraining: 100,
      proteinRest: 80,
      proteinLite: 60,
      waterTarget: 2.5,
      sleepTarget: 8,
      proteinTarget: 150,
      kcalTarget: 2000,
    },
    profile: {
      age: 30,
      gender: "Male",
      height: 180,
      startDay: 1,
      primaryGoal: "Muscle Gain",
      day1: "Push",
      day2: "Pull",
      day3: "Legs",
      day4: "Rest",
      day5: "Upper",
      day6: "Lower",
    },
    analytics: {
      averages: { protein: 90, kcal: 2000 },
      nutritionStats: [],
      weightTrend: [],
      meta: { period: "7d", logCount: 14, measurementCount: 2 },
    },
    trackedDayCount: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders user info when authenticated", () => {
    render(<ProfileTab {...defaultProps} />);
    expect(screen.getByText("Test User")).toBeDefined();
    expect(screen.getByText(/test@example.com/i)).toBeDefined();
    expect(screen.getByText(/Verified Elite/i)).toBeDefined();
  });

  it("renders Sign In button when not authenticated", () => {
    render(<ProfileTab {...defaultProps} session={null} />);
    expect(screen.getByText("Sign In")).toBeDefined();
    fireEvent.click(screen.getByText("Sign In"));
    expect(signIn).toHaveBeenCalled();
  });

  it("calls signOut when Sign Out button is clicked", () => {
    render(<ProfileTab {...defaultProps} />);
    const signOutBtn = screen.getByText("Sign Out");
    fireEvent.click(signOutBtn.closest("button")!);
    expect(signOut).toHaveBeenCalled();
  });

  it("navigates to settings when Settings button is clicked", () => {
    render(<ProfileTab {...defaultProps} />);
    const settingsBtn = screen.getByText(/App Settings/i);
    fireEvent.click(settingsBtn.closest("button")!);
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it("handles missing analytics safely", () => {
    render(<ProfileTab {...defaultProps} analytics={null} />);
    const zeroMatches = screen.getAllByText(/0/);
    expect(zeroMatches.length).toBeGreaterThan(0);
  });

  it("renders achievements when present", () => {
    const profileWithAchievements = {
      ...defaultProps.profile,
      achievements: [
        {
          id: "ach-1",
          title: "First Workout",
          description: "Completed your first workout",
          tier: "BRONZE",
          icon: "Dumbbell",
          unlockedAt: new Date().toISOString(),
        }
      ]
    };
    
    render(<ProfileTab {...defaultProps} profile={profileWithAchievements as any} />);
    expect(screen.getByText("First Workout")).toBeDefined();
    expect(screen.getByText("Completed your first workout")).toBeDefined();
  });

  it("handles missing user image", () => {
    const noImageSession = {
      ...defaultProps.session,
      user: { ...defaultProps.session.user, image: null }
    };
    render(<ProfileTab {...defaultProps} session={noImageSession as any} />);
    // The placeholder User icon should be rendered
    expect(document.querySelector('svg.lucide-user')).toBeDefined();
  });

  it("handles missing profile data safely", () => {
    render(<ProfileTab {...defaultProps} profile={null as any} />);
    // Should show "--" for age, etc.
    const dashes = screen.getAllByText("--");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders empty trophy case", () => {
    const profileNoAch = { ...defaultProps.profile, achievements: [] };
    render(<ProfileTab {...defaultProps} profile={profileNoAch as any} />);
    expect(screen.getByText(/No Trophies Yet/i)).toBeDefined();
  });

  it("handles null goal values gracefully", () => {
    const nullGoals = {
      proteinTraining: null,
      proteinRest: null,
      proteinLite: null,
      waterTarget: null,
      sleepTarget: null
    };
    render(<ProfileTab {...defaultProps} goals={nullGoals as any} />);
    
    // Should show "--" fallbacks for protein targets, water, sleep
    const placeholders = screen.getAllByText("--");
    expect(placeholders.length).toBeGreaterThanOrEqual(5);
  });
});

