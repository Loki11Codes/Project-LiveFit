import { describe, it, expect } from 'vitest';
import { calculateBMR, getActivityMultiplier, calculateDailyTargets } from './recommendations';

describe('recommendation utility', () => {
  const maleProfile = {
    gender: 'Male',
    age: 25,
    height: 180, // cm
    weight: 80,   // kg
    activityPreference: 'Moderate',
    primaryGoal: 'Maintenance',
  };

  it('calculates BMR correctly for men', () => {
    // (10 * 80) + (6.25 * 180) - (5 * 25) + 5 = 800 + 1125 - 125 + 5 = 1805
    expect(calculateBMR(maleProfile)).toBe(1805);
  });

  it('calculates BMR correctly for women', () => {
    const femaleProfile = { ...maleProfile, gender: 'Female' };
    // (10 * 80) + (6.25 * 180) - (5 * 25) - 161 = 800 + 1125 - 125 - 161 = 1639
    expect(calculateBMR(femaleProfile)).toBe(1639);
  });

  it('returns null for missing stats', () => {
    expect(calculateBMR({ age: 25 })).toBeNull();
  });

  it('gets correct activity multipliers', () => {
    expect(getActivityMultiplier('Sedentary')).toBe(1.2);
    expect(getActivityMultiplier('Moderate Activity')).toBe(1.55);
    expect(getActivityMultiplier('Athlete / Heavy Training')).toBe(1.9);
    expect(getActivityMultiplier(null)).toBe(1.2);
  });

  it('calculates daily maintenance targets correctly', () => {
    const targets = calculateDailyTargets(maleProfile);
    // BMR 1805 * 1.55 = 2797.75 -> 2798
    // Protein: 80 * 1.6 = 128
    expect(targets?.kcalTarget).toBe(2798);
    expect(targets?.proteinTarget).toBe(128);
  });

  it('calculates weight loss targets correctly', () => {
    const targets = calculateDailyTargets({ ...maleProfile, primaryGoal: 'Weight Loss' });
    // BMR 1805 * 1.55 = 2797.75 - 500 = 2297.75 -> 2298
    // Protein: 80 * 2.0 = 160
    expect(targets?.kcalTarget).toBe(2298);
    expect(targets?.proteinTarget).toBe(160);
  });

  it('calculates muscle gain targets correctly', () => {
    const targets = calculateDailyTargets({ ...maleProfile, primaryGoal: 'Muscle Gain' });
    // BMR 1805 * 1.55 = 2797.75 + 300 = 3097.75 -> 3098
    // Protein: 80 * 1.8 = 144
    expect(targets?.kcalTarget).toBe(3098);
    expect(targets?.proteinTarget).toBe(144);
  });

  // ── Diet Strategy: Macro-Ratio Splits ───────────────────────────

  it('produces balanced 50/50 carb/fat split by default', () => {
    const t = calculateDailyTargets(maleProfile)!;
    // Protein: 128g => 512 kcal. Remaining: 2797.75 - 512 = 2285.75
    // carbs: (2285.75 * 0.5) / 4 = 285.72 => 286
    expect(t.carbsTarget).toBe(286);
    // fats: (2285.75 * 0.5) / 9 = 127.0 => 127
    expect(t.fatsTarget).toBe(127);
  });

  it('produces a keto split (5% carb / 95% fat)', () => {
    const t = calculateDailyTargets({ ...maleProfile, dietaryPreference: 'Keto' })!;
    // Remaining: 2285.75
    // carbs: (2285.75 * 0.05) / 4 = 28.57 => 29
    expect(t.carbsTarget).toBe(29);
    // fats: (2285.75 * 0.95) / 9 = 241.27 => 241
    expect(t.fatsTarget).toBe(241);
  });

  it('produces a low-carb split (25% carb / 75% fat)', () => {
    const t = calculateDailyTargets({ ...maleProfile, dietaryPreference: 'Low Carb' })!;
    // carbs: (2285.75 * 0.25) / 4 = 142.86 => 143
    expect(t.carbsTarget).toBe(143);
    // fats: (2285.75 * 0.75) / 9 = 190.48 => 190
    expect(t.fatsTarget).toBe(190);
  });

  it('produces a paleo split (same as low-carb)', () => {
    const t = calculateDailyTargets({ ...maleProfile, dietaryPreference: 'Paleo' })!;
    expect(t.carbsTarget).toBe(143);
    expect(t.fatsTarget).toBe(190);
  });

  it('produces a vegan split (60% carb / 40% fat)', () => {
    const t = calculateDailyTargets({ ...maleProfile, dietaryPreference: 'Vegan' })!;
    // carbs: (2285.75 * 0.6) / 4 = 342.86 => 343
    expect(t.carbsTarget).toBe(343);
    // fats: (2285.75 * 0.4) / 9 = 101.59 => 102
    expect(t.fatsTarget).toBe(102);
  });

  it('produces a vegetarian split (same as vegan)', () => {
    const t = calculateDailyTargets({ ...maleProfile, dietaryPreference: 'Vegetarian' })!;
    expect(t.carbsTarget).toBe(343);
    expect(t.fatsTarget).toBe(102);
  });

  it('handles keto + fat loss combo correctly', () => {
    const t = calculateDailyTargets({
      ...maleProfile,
      primaryGoal: 'Fat loss',
      dietaryPreference: 'Keto',
    })!;
    expect(t.kcalTarget).toBe(2298);
    expect(t.proteinTarget).toBe(160);
    // remaining: 2297.75 - (160*4) = 1657.75
    // carbs: (1657.75 * 0.05) / 4 = 20.72 => 21
    expect(t.carbsTarget).toBe(21);
    // fats: (1657.75 * 0.95) / 9 = 174.98 => 175
    expect(t.fatsTarget).toBe(175);
  });

  it('returns null for incomplete profile', () => {
    expect(calculateDailyTargets({ gender: 'Male' })).toBeNull();
  });

  it('covers remaining activity multipliers', () => {
    expect(getActivityMultiplier('Very Hard Training')).toBe(1.725);
    expect(getActivityMultiplier('Light activity')).toBe(1.375);
    expect(getActivityMultiplier('Random unknown')).toBe(1.2);
  });

  it('handles zero or null weight for protein target', () => {
    const t0 = calculateDailyTargets({ ...maleProfile, weight: 0 });
    expect(t0).toBeNull();

    // calculateDailyTargets has line 69: (stats.weight || 0)
    // But calculateBMR returns null if weight is null.
    // So to hit line 69 with 0, we need calculateBMR to pass but weight to be falsy?
    // That's impossible because calculateBMR needs weight.
    // Wait! calculateBMR checks !weight. 0 is !weight.
  });

  it('handles null primaryGoal and dietaryPreference', () => {
    const targets = calculateDailyTargets({
      ...maleProfile,
      primaryGoal: null as unknown as string,
      dietaryPreference: null as unknown as string,
    });
    expect(targets).not.toBeNull();
    expect(targets?.kcalTarget).toBe(2798); // maintenance
    expect(targets?.carbsTarget).toBe(286); // balanced
  });
});

