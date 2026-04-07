import { describe, it, expect } from "vitest";
import { getSmartSuggestion } from "./meal-suggestions";

describe("Meal Suggestions Engine", () => {
  it("suggests high-protein food when deficit is large (>30g)", () => {
    const suggestion = getSmartSuggestion(50, 100, 1500, 2000);
    expect(suggestion?.name).toBe("Chicken Breast (150g)");
    expect(suggestion?.benefit).toBe("Lean tissue");
  });

  it("suggests moderate-protein food when deficit is >15g", () => {
    const suggestion = getSmartSuggestion(80, 100, 1500, 2000);
    expect(suggestion?.name).toBe("Greek Yogurt (Non-fat)");
    expect(suggestion?.benefit).toBe("Protein boost");
  });

  it("suggests energy-focused food when protein is mostly hit but calories are low", () => {
    const suggestion = getSmartSuggestion(95, 100, 1500, 2200);
    expect(suggestion?.name).toBe("Mixed Berries & Oats");
    expect(suggestion?.benefit).toBe("Sustain energy");
  });

  it("suggests light food when targets are nearly hit", () => {
    const suggestion = getSmartSuggestion(98, 100, 1900, 2100);
    expect(suggestion?.name).toBe("Avocado & Spinach Salad");
    expect(suggestion?.benefit).toBe("Micronutrients");
  });

  it("returns null when all targets are exceeded", () => {
    const suggestion = getSmartSuggestion(110, 100, 2500, 2000);
    expect(suggestion).toBeNull();
  });
});
