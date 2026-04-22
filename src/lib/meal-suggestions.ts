import { Beef, Salad, Flame, Wheat, Target, type LucideIcon } from "lucide-react";

export interface FoodSuggestion {
  name: string;
  protein: number;
  calories: number;
  icon: LucideIcon;
  benefit: string;
}

const POWER_FOODS: FoodSuggestion[] = [
  { name: "Greek Yogurt (Non-fat)", protein: 18, calories: 100, icon: Beef, benefit: "Protein boost" },
  { name: "Whey Protein Shake", protein: 25, calories: 120, icon: Beef, benefit: "Fast absorption" },
  { name: "Chicken Breast (150g)", protein: 35, calories: 165, icon: Flame, benefit: "Lean tissue" },
  { name: "Cottage Cheese", protein: 28, calories: 180, icon: Target, benefit: "Stay full" },
  { name: "Mixed Berries & Oats", protein: 5, calories: 200, icon: Wheat, benefit: "Sustain energy" },
  { name: "Avocado & Spinach Salad", protein: 4, calories: 150, icon: Salad, benefit: "Micronutrients" },
];

export function getSmartSuggestion(
  currentProtein: number,
  targetProtein: number,
  currentCalories: number,
  targetCalories: number
): FoodSuggestion | null {
  const proteinDeficit = Math.max(0, targetProtein - currentProtein);
  const calorieSurplus = Math.max(0, targetCalories - currentCalories);

  // If protein is the main gap (>30g missing)
  if (proteinDeficit > 30) {
    return POWER_FOODS[2]; // Chicken Breast
  } 

  // If moderately behind on protein (>15g)
  if (proteinDeficit > 15) {
    return POWER_FOODS[0]; // Greek Yogurt
  }

  // If calories are low but protein is okay
  if (calorieSurplus > 400 && proteinDeficit < 10) {
    return POWER_FOODS[4]; // Mixed Berries & Oats
  }

  // Default to a light snack if everything is mostly on track
  if (calorieSurplus > 100) {
    return POWER_FOODS[5]; // Salad
  }

  return null;
}
