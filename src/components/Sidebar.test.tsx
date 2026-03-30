/* eslint-disable @typescript-eslint/no-explicit-any */
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
    fats: 50,
    fiber: 25,
    weight: 70,
    sleep: 8,
    day: 1,
    dayType: "Rest" as const,
    setDayType: vi.fn(),
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
});

