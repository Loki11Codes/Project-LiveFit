/**
 * Logic for calculating suggested weight and reps based on Personal Records (PRs)
 * and target rep ranges provided by a routine.
 */

type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Glutes' | 'Calves' | 'Core' | 'Abs' | 'Cardio';

interface ProgressionInputs {
  exerciseName: string;
  category: string;
  currentPRWeight?: number;
  currentPRReps?: number;
  targetReps: string; // e.g., "8-12" or "10"
}

interface ProgressionResult {
  weight: string;
  reps: string;
  reason: string;
}

export function calculateSuggestedTarget({
  category,
  currentPRWeight,
  currentPRReps,
  targetReps
}: ProgressionInputs): ProgressionResult {
  // Parse target reps (handle "8-12" or "10")
  const repMatch = targetReps.match(/(\d+)/g);
  const minReps = repMatch ? Number.parseInt(repMatch[0], 10) : 8;
  const maxReps = repMatch && repMatch.length > 1 ? Number.parseInt(repMatch[1], 10) : minReps;

  // Base case: No PR yet (use default)
  if (!currentPRWeight) {
    return {
      weight: "",
      reps: targetReps,
      reason: "Start fresh and find your baseline."
    };
  }

  const isLowerBody = ['Legs', 'Glutes', 'Calves', 'Quads', 'Hamstrings'].some(c => 
    category.includes(c)
  );

  const isCore = ['Core', 'Abs'].some(c => category.includes(c));

  // Logic: 
  // 1. If last reps >= max target reps: Increase weight, reset reps to min.
  // 2. If last reps < max target reps: Maintain weight, increase reps by 1-2.

  let suggestedWeight = currentPRWeight;
  let suggestedReps = Math.min(maxReps, (currentPRReps || minReps) + 1);
  let reason = "Maintaining load, pushing for more volume.";

  if ((currentPRReps || 0) >= maxReps) {
    let increment = 2.5;
    if (isLowerBody) increment = 5;
    else if (isCore) increment = 1;
    
    suggestedWeight = currentPRWeight + increment;
    suggestedReps = minReps;
    reason = `Target reps achieved! Increasing load by ${increment}kg.`;
  }

  return {
    weight: suggestedWeight.toString(),
    reps: suggestedReps.toString(),
    reason
  };
}
