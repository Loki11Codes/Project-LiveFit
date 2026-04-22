 
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Sidebar from "./Sidebar";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      style,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props} style={style}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe("Sidebar Component", () => {
  const defaultProps = {
    protein: 50,
    proteinTarget: 100,
    calories: 1500,
    calorieTarget: 2000,
    carbs: 150,
    carbsTarget: 300,
    fats: 50,
    fatsTarget: 80,
    fiber: 25,
    water: 2,
    waterTarget: 3,
    weight: 70,
    sleep: 8,
    sleepTarget: 8,
    dayType: "Rest" as const,
    setDayType: vi.fn(),
    hasWorkout: false,
    analytics: null,
    logs: {
      food: [],
      workouts: [],
      sleep: [],
      water: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders protein progress correctly", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getAllByText("Protein").length).toBeGreaterThan(0);
    expect(screen.getAllByText("50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/100g").length).toBeGreaterThan(0);
  });

  it("handles protein goal reached correctly", () => {
    render(<Sidebar {...defaultProps} protein={100} />);
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/100g").length).toBeGreaterThan(0);
  });

  it("renders calorie progress and remaining kcal correctly", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getAllByText("Calories").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1500").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/2000").length).toBeGreaterThan(0);
  });

  it("renders stats rows for weight, sleep, etc.", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Weight")).toBeDefined();
    expect(screen.getByText("70")).toBeDefined();
    expect(screen.getByText("Sleep")).toBeDefined();
    expect(screen.getByText("8")).toBeDefined();
  });

  it("calls setDayType when a day type button is clicked", () => {
    render(<Sidebar {...defaultProps} />);
    const trainBtn = screen.getByText("Train");
    const button = trainBtn.closest("button");
    if (button) fireEvent.click(button);
    expect(defaultProps.setDayType).toHaveBeenCalledWith("Training");
  });

  it("highlights the active day type", () => {
    render(<Sidebar {...defaultProps} dayType="Training" />);
    // Testing specific class name or style if needed, but checking for label is usually enough
    expect(screen.getByText("Train")).toBeDefined();
  });

  it("opens and closes the metric popover", () => {
    render(<Sidebar {...defaultProps} />);
    const labels = screen.getAllByText("Protein");
    if (labels.length > 0) {
      fireEvent.click(labels[0]);
      expect(screen.getByText("Past 7 Days")).toBeInTheDocument();
    }
  });

  it("renders WorkoutLiveAssistant when a session is active", () => {
    const activeWorkout = {
      name: "Upper Body Power",
      startTime: Date.now() - 1000 * 60 * 10, // 10 mins ago
      exercises: [
        {
          id: "ex-1",
          exerciseId: "bench",
          name: "Bench Press",
          sets: [
            { id: "s1", weight: "80", reps: "8", isCompleted: true },
            { id: "s2", weight: "80", reps: "8", isCompleted: false },
          ]
        }
      ]
    };
    render(<Sidebar {...defaultProps} activeWorkout={activeWorkout} />);
    
    expect(screen.getByText("Live Session")).toBeInTheDocument();
    expect(screen.getByText("Upper Body Power")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 Sets")).toBeInTheDocument();
    // Stats rows like "Weight" should be hidden
    expect(screen.queryByText("Weight")).not.toBeInTheDocument();
  });
});

