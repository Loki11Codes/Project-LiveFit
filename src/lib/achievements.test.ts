import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBadgeById, syncAchievements, ACHIEVEMENT_REGISTRY, type PrismaTx } from './achievements';

// ── getBadgeById ──────────────────────────────────────────────────────────────

describe('getBadgeById', () => {
  it('returns the correct badge for a known id', () => {
    const badge = getBadgeById('bench-bronze');
    expect(badge).toBeDefined();
    expect(badge?.title).toBe('Bench Baseline');
    expect(badge?.tier).toBe('BRONZE');
  });

  it('returns undefined for an unknown id', () => {
    expect(getBadgeById('does-not-exist')).toBeUndefined();
  });
});

// ── ACHIEVEMENT_REGISTRY ──────────────────────────────────────────────────────

describe('ACHIEVEMENT_REGISTRY', () => {
  it('contains at least one achievement of each type category', () => {
    const types = ACHIEVEMENT_REGISTRY.map((b) => b.type);
    expect(types).toContain('PR');
    expect(types).toContain('STREAK');
    expect(types).toContain('CONSISTENCY');
  });

  it('has unique badgeIds', () => {
    const ids = ACHIEVEMENT_REGISTRY.map((b) => b.badgeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── syncAchievements ──────────────────────────────────────────────────────────

const makeTx = (overrides: Partial<{
  existing: Array<{ badgeId: string }>;
  prs: Array<{ exercise: { name: string }, maxWeight: number | null }>;
  workoutCount: number;
  createMany: unknown;
}> = {}) => {
  const createMany = overrides.createMany ?? vi.fn().mockResolvedValue({ count: 0 });
  return {
    achievement: {
      findMany: vi.fn().mockResolvedValue(overrides.existing ?? []),
      createMany,
    },
    personalRecord: {
      findMany: vi.fn().mockResolvedValue(overrides.prs ?? []),
    },
    workoutLog: {
      count: vi.fn().mockResolvedValue(overrides.workoutCount ?? 0),
    },
  } as unknown as PrismaTx;
};

describe('syncAchievements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when user has no PRs or streaks', async () => {
    const tx = makeTx();
    const result = await syncAchievements(tx, 'user-1');
    expect(result).toEqual([]);
    expect(tx.achievement.createMany).not.toHaveBeenCalled();
  });

  it('unlocks bench-bronze when bench PR ≥ 50kg', async () => {
    const tx = makeTx({
      prs: [{ exercise: { name: 'Bench Press' }, maxWeight: 55 }],
    });
    const result = await syncAchievements(tx, 'user-1');
    expect(result.map((b) => b.badgeId)).toContain('bench-bronze');
    expect(tx.achievement.createMany).toHaveBeenCalled();
  });

  it('unlocks multiple bench milestones at once when PR is high enough', async () => {
    const tx = makeTx({
      prs: [{ exercise: { name: 'Bench Press' }, maxWeight: 105 }],
    });
    const result = await syncAchievements(tx, 'user-1');
    const ids = result.map((b) => b.badgeId);
    expect(ids).toContain('bench-bronze');
    expect(ids).toContain('bench-silver');
    expect(ids).toContain('bench-gold');
    expect(ids).not.toContain('bench-platinum'); // 105 < 120
  });

  it('unlocks bench-platinum when PR ≥ 120kg', async () => {
    const tx = makeTx({
      prs: [{ exercise: { name: 'Bench Press' }, maxWeight: 130 }],
    });
    const result = await syncAchievements(tx, 'user-1');
    const ids = result.map((b) => b.badgeId);
    expect(ids).toContain('bench-platinum');
  });

  it('skips milestones the user already has', async () => {
    const tx = makeTx({
      existing: [{ badgeId: 'bench-bronze' }, { badgeId: 'bench-silver' }],
      prs: [{ exercise: { name: 'Bench Press' }, maxWeight: 90 }],
    });
    const result = await syncAchievements(tx, 'user-1');
    const ids = result.map((b) => b.badgeId);
    expect(ids).not.toContain('bench-bronze');
    expect(ids).not.toContain('bench-silver');
  });

  it('does not unlock bench milestones when bench PR weight is too low', async () => {
    const tx = makeTx({
      prs: [{ exercise: { name: 'Bench Press' }, maxWeight: 30 }],
    });
    const result = await syncAchievements(tx, 'user-1');
    expect(result).toHaveLength(0);
  });

  it('does not unlock bench milestones for a different exercise', async () => {
    const tx = makeTx({
      prs: [{ exercise: { name: 'Squat' }, maxWeight: 200 }],
    });
    const result = await syncAchievements(tx, 'user-1');
    expect(result).toHaveLength(0);
  });

  it('persists newly unlocked achievements with correct shape', async () => {
    const createMany = vi.fn().mockResolvedValue({});
    const tx = makeTx({
      prs: [{ exercise: { name: 'Bench Press' }, maxWeight: 55 }],
      createMany,
    });
    await syncAchievements(tx, 'user-42');
    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-42',
          badgeId: 'bench-bronze',
          tier: 'BRONZE',
        }),
      ]),
    });
  });

  it('unlocks protein-power when workout count ≥ 1', async () => {
    const tx = makeTx({
      workoutCount: 1,
    });
    const result = await syncAchievements(tx, 'user-1');
    expect(result.map((b) => b.badgeId)).toContain('protein-power');
  });
});
