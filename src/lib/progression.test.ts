import { describe, it, expect } from 'vitest';
import { calculateSuggestedTarget } from './progression';

describe('Progression Logic', () => {
  it('suggests starting weight when no PR exists', () => {
    const result = calculateSuggestedTarget({
      exerciseName: 'Bench Press',
      category: 'Chest',
      targetReps: '8-12'
    });
    expect(result.weight).toBe("");
    expect(result.reps).toBe("8-12");
  });

  it('suggests increasing weight when rep target is met (Upper Body)', () => {
    const result = calculateSuggestedTarget({
      exerciseName: 'Bench Press',
      category: 'Chest',
      currentPRWeight: 80,
      currentPRReps: 12,
      targetReps: '8-12'
    });
    expect(result.weight).toBe("82.5");
    expect(result.reps).toBe("8");
  });

  it('suggests increasing weight when rep target is met (Lower Body)', () => {
    const result = calculateSuggestedTarget({
      exerciseName: 'Squat',
      category: 'Legs',
      currentPRWeight: 100,
      currentPRReps: 10,
      targetReps: '8-10'
    });
    expect(result.weight).toBe("105");
    expect(result.reps).toBe("8");
  });

  it('suggests increasing reps when weight target is not yet mastered', () => {
    const result = calculateSuggestedTarget({
      exerciseName: 'Bench Press',
      category: 'Chest',
      currentPRWeight: 80,
      currentPRReps: 8,
      targetReps: '8-12'
    });
    expect(result.weight).toBe("80");
    expect(result.reps).toBe("9");
  });
});
