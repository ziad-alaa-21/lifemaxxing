// Strength standards, Epley 1RM calculation, and Rank Tiers

export interface ExerciseStandard {
  exercise_id: string;
  name: string;
  ranked_key: string;
  standards: {
    tier: string;
    multiplier: number;
    colorClass: string;
    badgeToken: string;
  }[];
}

export const CANONICAL_EXERCISES = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Bench Press (Barbell)", key: "bench_press" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Squat (Barbell)", key: "squat" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Deadlift (Barbell)", key: "deadlift" },
  { id: "00000000-0000-0000-0000-000000000004", name: "Overhead Press (Barbell)", key: "overhead_press" },
  { id: "00000000-0000-0000-0000-000000000005", name: "Weighted Pull-up", key: "pull_up" },
  { id: "00000000-0000-0000-0000-000000000006", name: "Barbell Row", key: "barbell_row" },
];

export const RANK_TIERS = [
  { name: "Untrained", color: "text-rank-bronze bg-rank-bronze/10 border-rank-bronze/30" },
  { name: "Novice", color: "text-rank-silver bg-rank-silver/10 border-rank-silver/30" },
  { name: "Intermediate", color: "text-rank-gold bg-rank-gold/10 border-rank-gold/30" },
  { name: "Advanced", color: "text-rank-platinum bg-rank-platinum/10 border-rank-platinum/30" },
  { name: "Elite", color: "text-rank-diamond bg-rank-diamond/10 border-rank-diamond/30" },
  { name: "Olympian", color: "text-rank-olympian bg-rank-olympian/10 border-rank-olympian/30" },
  { name: "Mr. Olympia", color: "text-rank-mr-olympia bg-rank-mr-olympia/10 border-rank-mr-olympia/30" },
];

/**
 * Epley 1RM formula: weight * (1 + reps / 30.0)
 * Strictly calculated only when reps <= 10.
 * If reps === 1, e1rm = weight.
 * If reps > 10, returns null.
 */
export function calculateEpley1RM(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps <= 0) return null;
  if (reps === 1) return weightKg;
  if (reps > 10) return null; // Rule: calculated only when reps <= 10

  const e1rm = weightKg * (1 + reps / 30.0);
  return Math.round(e1rm * 10) / 10;
}

export function getTierColor(tierName: string) {
  const match = RANK_TIERS.find((t) => t.name.toLowerCase() === tierName.toLowerCase());
  return match?.color || "text-on-surface bg-surface-container-high border-border-subtle";
}

/**
 * Determine rank tier based on exercise ID, 1RM, bodyweight, and standards
 */
export function determineTier(
  exerciseId: string,
  e1rmKg: number,
  bodyweightKg: number,
  standards: { tier: string; multiplier: number }[]
): { tier: string; ratio: number; nextTier?: string; nextTargetKg?: number } {
  if (bodyweightKg <= 0) {
    return { tier: "Untrained", ratio: 0 };
  }

  // Pull-up uses added weight only
  const ratio = Math.round((e1rmKg / bodyweightKg) * 1000) / 1000;

  // Sort standards ascending
  const sorted = [...standards].sort((a, b) => a.multiplier - b.multiplier);

  let currentTier = "Untrained";
  let nextTier: string | undefined;
  let nextTargetKg: number | undefined;

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (ratio >= s.multiplier) {
      currentTier = s.tier;
    } else {
      nextTier = s.tier;
      nextTargetKg = Math.round(s.multiplier * bodyweightKg * 10) / 10;
      break;
    }
  }

  return { tier: currentTier, ratio, nextTier, nextTargetKg };
}
