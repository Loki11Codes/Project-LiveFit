export interface ProfileStats {
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  activityPreference?: string | null;
  primaryGoal?: string | null;
}

export interface RecommendedTargets {
  kcalTarget: number;
  proteinTarget: number;
}

/**
 * Calculates BMR using Miffin-St Jeor Equation.
 * Weight in kg, Height in cm, Age in years.
 */
export function calculateBMR(stats: ProfileStats): number | null {
  const { gender, age, height, weight } = stats;
  if (!age || !height || !weight || !gender) return null;

  const isMale = gender.toLowerCase().includes('male') && !gender.toLowerCase().includes('female');
  const bmr = (10 * weight) + (6.25 * height) - (5 * age);
  
  return isMale ? bmr + 5 : bmr - 161;
}

/**
 * Maps activity preference string to standard activity multipliers.
 */
export function getActivityMultiplier(activity?: string | null): number {
  if (!activity) return 1.2; // Sedentary fallback
  
  const val = activity.toLowerCase();
  if (val.includes('athlete') || val.includes('extra') || val.includes('heavy')) return 1.9;
  if (val.includes('very') || val.includes('hard')) return 1.725;
  if (val.includes('moderate')) return 1.55;
  if (val.includes('light')) return 1.375;
  
  return 1.2; // Default to sedentary
}

/**
 * Calculates recommended daily targets based on Mifflin-St Jeor BMR and activity level.
 */
export function calculateDailyTargets(stats: ProfileStats): RecommendedTargets | null {
  const bmr = calculateBMR(stats);
  if (!bmr) return null;

  const tdee = bmr * getActivityMultiplier(stats.activityPreference);
  const goal = (stats.primaryGoal || '').toLowerCase();
  
  let kcalTarget = tdee;
  let proteinMultiplier = 1.6; // Default 1.6g per kg

  if (goal.includes('loss') || goal.includes('cut')) {
    kcalTarget -= 500;
    proteinMultiplier = 2; // Higher protein to preserve muscle on cut
  } else if (goal.includes('gain') || goal.includes('bulk')) {
    kcalTarget += 300;
    proteinMultiplier = 1.8; // Sufficient for growth
  }

  return {
    kcalTarget: Math.round(kcalTarget),
    proteinTarget: Math.round((stats.weight || 0) * proteinMultiplier),
  };
}
