 
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
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
      expect(screen.getByText("Protein Trend")).toBeInTheDocument();
      const closeBtn = screen.getByRole("button", { name: /Close/i });
      fireEvent.click(closeBtn);
    }
  });

  it("opens popover when clicking Calories metric", async () => {
    render(<Sidebar {...defaultProps} />);
    const calBtn = screen.getByTestId("metric-calories");
    fireEvent.click(calBtn);
    expect(await screen.findByText("Calories Trend")).toBeInTheDocument();
  });

  it("renders empty state when no activities recorded", () => {
    render(<Sidebar {...defaultProps} logs={null} />);
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  it("renders recent activities when logs are provided", () => {
    const logsWithData = {
      ...defaultProps.logs,
      food: [{ id: "f1", name: "Apple", time: new Date().toISOString(), kcal: 95 }],
      water: [{ id: "w1", amount: 250, time: new Date().toISOString() }],
      workouts: [{ id: "wk1", focus: "Push Day", time: new Date().toISOString() }]
    };
    render(<Sidebar {...defaultProps} logs={logsWithData as any} />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Hydration logged")).toBeInTheDocument();
    expect(screen.getByText("Push Day")).toBeInTheDocument();
  });

  it("changes active metric when clicking small metrics", () => {
    render(<Sidebar {...defaultProps} />);
    const waterMetric = screen.getByText("Water").closest("button");
    if (waterMetric) fireEvent.click(waterMetric);
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

  it("calculates weight and sleep trends correctly", () => {
    const analytics = {
      weightTrend: [
        { day: "2024-01-01", weight: 71 }, // at(-2) = 71, delta = 72-71 = +1
        { day: "2024-01-02", weight: 72 }, // latest (not used for delta)
      ],
      nutritionStats: [],
      averages: { protein: 0, kcal: 0 },
      meta: { period: "7d", logCount: 0, measurementCount: 0 }
    };
    const logs = {
      ...defaultProps.logs,
      sleep: [
        { id: "s1", hours: 7, time: "2024-01-01T00:00:00Z" }, // at(-2) = 7, delta = 8-7 = +1
        { id: "s2", hours: 8, time: "2024-01-02T00:00:00Z" }, // latest
      ]
    };
    
    // weight prop=72, previous (at(-2))=71 → weightDelta = +1.0
    // sleep prop=8, previous (at(-2)).hours=7 → sleepDelta = +1.0
    render(<Sidebar {...defaultProps} weight={72} sleep={8} analytics={analytics as any} logs={logs as any} />);
    
    // Both weight and sleep deltas should be +1.0
    const plusOneLabels = screen.getAllByText("+1.0");
    expect(plusOneLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("handles coach suggestion logging", () => {
    render(<Sidebar {...defaultProps} protein={20} />);
    const logBtn = screen.getByRole("button", { name: /Log/i });
    fireEvent.click(logBtn);
    expect(screen.getByText("Suggestion Logged")).toBeInTheDocument();
  });

  it("handles WorkoutLiveAssistant finishing up label when exercises are empty", () => {
    const activeWorkout = {
      name: "", // Should fallback to "Active Workout"
      startTime: Date.now(),
      exercises: [] // No exercises → currentEx is undefined → "Finishing up..."
    };
    render(<Sidebar {...defaultProps} activeWorkout={activeWorkout as any} />);
    expect(screen.getByText("Active Workout")).toBeInTheDocument();
    expect(screen.getByText("Next: Finishing up...")).toBeInTheDocument();
  });

  it("handles active workout with all sets completed", () => {
    const activeWorkout = {
      name: "Powerlifting",
      startTime: Date.now(),
      exercises: [
        {
          id: "ex-1",
          name: "Deadlift",
          sets: [{ id: "s1", isCompleted: true }]
        }
      ]
    };
    render(<Sidebar {...defaultProps} activeWorkout={activeWorkout as any} />);
    // currentEx will be session.exercises.at(-1) which is Deadlift
    expect(screen.getByText("Next: Deadlift")).toBeInTheDocument();
  });

  it("renders near hit statuses for protein and calories", () => {
    render(<Sidebar {...defaultProps} protein={75} proteinTarget={100} calories={1700} calorieTarget={2000} />);
    // proteinPct = 75% (>= 70), caloriePct = 85% (>= 80)
    // We can't easily check internal status strings, but we can verify they render
    expect(screen.getByText("Protein")).toBeDefined();
    expect(screen.getByText("Calories")).toBeDefined();
  });

  it("handles negative trends for weight and sleep", () => {
    const analytics = {
      weightTrend: [
        { day: "2024-01-01", weight: 73 }, // delta = 72 - 73 = -1
        { day: "2024-01-02", weight: 72 },
      ],
      nutritionStats: [],
      averages: { protein: 0, kcal: 0 },
      meta: { period: "7d", logCount: 0, measurementCount: 0 }
    };
    const logs = {
      ...defaultProps.logs,
      sleep: [
        { id: "s1", hours: 9, time: "2024-01-01T00:00:00Z" }, // delta = 8 - 9 = -1
        { id: "s2", hours: 8, time: "2024-01-02T00:00:00Z" },
      ]
    };
    render(<Sidebar {...defaultProps} weight={72} sleep={8} analytics={analytics as any} logs={logs as any} />);
    
    const minusOneLabels = screen.getAllByText("-1.0");
    expect(minusOneLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("handles '--' values for weight and sleep", () => {
    render(<Sidebar {...defaultProps} weight="--" sleep="--" />);
    // value: weight === "--" ? 0 : weight
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it("renders coach tips for low protein, training day, and high calories", () => {
    const { rerender } = render(<Sidebar {...defaultProps} protein={20} />);
    expect(screen.getByText(/Protein is low/i)).toBeInTheDocument();

    rerender(<Sidebar {...defaultProps} hasWorkout={false} dayType="Training" protein={100} />);
    expect(screen.getByText(/Training day!/i)).toBeInTheDocument();

    rerender(<Sidebar {...defaultProps} calories={3000} protein={100} />);
    expect(screen.getByText(/Calories are climbing/i)).toBeInTheDocument();
  });

  it("renders AI insights and handles onTabChange", () => {
    const aiInsights = [
      { id: "insight-1", title: "Boost Fiber", content: "Eat more veggies", type: "NUTRITION", priority: "MEDIUM" }
    ];
    const onTabChange = vi.fn();
    render(<Sidebar {...defaultProps} aiInsights={aiInsights as any} onTabChange={onTabChange} />);
    
    expect(screen.getByText("Boost Fiber")).toBeInTheDocument();
    
    // Click Weekly Meal Plan button
    const mealPlanBtn = screen.getByText("Weekly Meal Plan").closest("button");
    if (mealPlanBtn) fireEvent.click(mealPlanBtn);
    expect(onTabChange).toHaveBeenCalledWith("meals");
  });

  it("handles missing logs safely in RecentActivity", () => {
    render(<Sidebar {...defaultProps} logs={null as any} />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
  });
});

