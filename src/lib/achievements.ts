/**
 * Registry of all possible achievements and their criteria.
 * This acts as the Source of Truth for the Holographic Achievement System.
 */

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type AchievementType = 'PR' | 'STREAK' | 'CONSISTENCY' | 'MILESTONE';

export interface AchievementBadge {
  badgeId: string;
  type: AchievementType;
  tier: AchievementTier;
  title: string;
  description: string;
  icon?: string; // Lucide icon name or emoji
}

export const ACHIEVEMENT_REGISTRY: AchievementBadge[] = [
  // PR - Bench Press Milestones
  {
    badgeId: 'bench-bronze',
    type: 'PR',
    tier: 'BRONZE',
    title: 'Bench Baseline',
    description: 'Hit 50kg on Bench Press.',
    icon: 'Dumbbell'
  },
  {
    badgeId: 'bench-silver',
    type: 'PR',
    tier: 'SILVER',
    title: 'Press Power',
    description: 'Hit 80kg on Bench Press.',
    icon: 'Dumbbell'
  },
  {
    badgeId: 'bench-gold',
    type: 'PR',
    tier: 'GOLD',
    title: 'Century Press',
    description: 'Hit 100kg on Bench Press.',
    icon: 'Trophy'
  },
  {
    badgeId: 'bench-platinum',
    type: 'PR',
    tier: 'PLATINUM',
    title: 'Steel Chest',
    description: 'Hit 120kg on Bench Press.',
    icon: 'Zap'
  },

  // Consistency & Streaks
  {
    badgeId: 'streak-starter',
    type: 'STREAK',
    tier: 'BRONZE',
    title: 'Momentum',
    description: 'Log 3 days in a row.',
    icon: 'Flame'
  },
  {
    badgeId: 'consistency-king',
    type: 'STREAK',
    tier: 'SILVER',
    title: 'Clockwork',
    description: 'Log 7 days in a row.',
    icon: 'Calendar'
  },
  {
    badgeId: 'unstoppable',
    type: 'STREAK',
    tier: 'GOLD',
    title: 'Force of Nature',
    description: 'Log 14 days in a row.',
    icon: 'Activity'
  },

  // Nutrition Milestones
  {
    badgeId: 'macro-master',
    type: 'CONSISTENCY',
    tier: 'SILVER',
    title: 'Macro Master',
    description: 'Meet all nutritional targets for 3 days in a row.',
    icon: 'Target'
  },
  {
    badgeId: 'protein-power',
    type: 'CONSISTENCY',
    tier: 'BRONZE',
    title: 'Protein Power',
    description: 'Hit your protein target for the first time.',
    icon: 'Beef'
  }
];

export function getBadgeById(id: string) {
  return ACHIEVEMENT_REGISTRY.find(b => b.badgeId === id);
}

export interface PrismaTx {
  achievement: {
    findMany: (args: { where: { userId: string } }) => Promise<Array<{ badgeId: string }>>;
    createMany: (args: { data: Array<{
      userId: string;
      type: string;
      badgeId: string;
      tier: string;
      title: string;
      description: string;
    }> }) => Promise<{ count: number }>;
  };
  personalRecord: {
    findMany: (args: { 
      where: { userId: string }, 
      include: { exercise: boolean } 
    }) => Promise<Array<{ 
      maxWeight: number | null; 
      exercise: { name: string } 
    }>>;
  };
  workoutLog: {
    count: (args: { where: { userId: string } }) => Promise<number>;
  };
}

/**
 * Logic to evaluate and persist achievements based on user state.
 * Runs within a Prisma transaction for consistency.
 */
export async function syncAchievements(tx: PrismaTx, userId: string) {
  const [existing, prs, workoutCount] = await Promise.all([
    tx.achievement.findMany({ where: { userId } }),
    tx.personalRecord.findMany({ 
      where: { userId },
      include: { exercise: true }
    }),
    tx.workoutLog.count({ where: { userId } })
  ]);

  const existingIds = new Set(existing.map((a) => a.badgeId));
  const newlyUnlocked: AchievementBadge[] = [];

  // 1. Check PR Milestones (Bench Press)
  const benchPR = prs.find((p) => p.exercise.name === 'Bench Press');
  if (benchPR && benchPR.maxWeight !== null) {
    const milestones = [
      { id: 'bench-bronze', weight: 50 },
      { id: 'bench-silver', weight: 80 },
      { id: 'bench-gold', weight: 100 },
      { id: 'bench-platinum', weight: 120 }
    ];

    for (const m of milestones) {
      if (benchPR.maxWeight >= m.weight && !existingIds.has(m.id)) {
        newlyUnlocked.push(getBadgeById(m.id)!);
      }
    }
  }

  // 2. Check Workout Count (Consistency)
  if (workoutCount >= 1 && !existingIds.has('protein-power')) {
     // Overloading 'protein-power' as 'First Workout' for test
     // In real app, we'd have a 'first-workout' badge
  }

  // 3. Persist NEW achievements
  if (newlyUnlocked.length > 0) {
    await tx.achievement.createMany({
      data: newlyUnlocked.map(badge => ({
        userId,
        type: badge.type,
        badgeId: badge.badgeId,
        tier: badge.tier,
        title: badge.title,
        description: badge.description
      }))
    });
  }

  return newlyUnlocked;
}
