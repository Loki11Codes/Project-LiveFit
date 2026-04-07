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
});
