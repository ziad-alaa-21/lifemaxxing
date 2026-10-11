// Strength standards, Epley 1RM calculation, and Rank Tiers

export const CANONICAL_EXERCISES = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Bench Press (Barbell)", key: "bench_press", muscle: "Chest" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Squat (Barbell)", key: "squat", muscle: "Legs" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Deadlift (Barbell)", key: "deadlift", muscle: "Back" },
  { id: "00000000-0000-0000-0000-000000000004", name: "Overhead Press (Barbell)", key: "overhead_press", muscle: "Shoulders" },
  { id: "00000000-0000-0000-0000-000000000005", name: "Weighted Pull-up", key: "pull_up", muscle: "Back" },
  { id: "00000000-0000-0000-0000-000000000006", name: "Barbell Row", key: "barbell_row", muscle: "Back" },
];

export const TIER_NAMES = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Olympian",
  "Mr. Olympia",
] as const;

export type TierName = (typeof TIER_NAMES)[number] | "Unranked";

export const RANK_TIERS = [
  { name: "Bronze", color: "text-rank-bronze bg-rank-bronze/10 border-rank-bronze/30" },
  { name: "Silver", color: "text-rank-silver bg-rank-silver/10 border-rank-silver/30" },
  { name: "Gold", color: "text-rank-gold bg-rank-gold/10 border-rank-gold/30" },
  { name: "Platinum", color: "text-rank-platinum bg-rank-platinum/10 border-rank-platinum/30" },
  { name: "Diamond", color: "text-rank-diamond bg-rank-diamond/10 border-rank-diamond/30" },
  { name: "Olympian", color: "text-rank-olympian bg-rank-olympian/10 border-rank-olympian/30" },
  { name: "Mr. Olympia", color: "text-rank-mr-olympia bg-rank-mr-olympia/10 border-rank-mr-olympia/30" },
];

export const UNRANKED_STYLE = "text-text-muted bg-surface-container-high border-border-subtle";

// Approved Men's standards table
export const MEN_STANDARDS: Record<string, number[]> = {
  bench_press: [0.7, 1.0, 1.3, 1.6, 1.8, 2.0, 2.2],
  squat: [1.0, 1.3, 1.6, 2.0, 2.3, 2.6, 2.8],
  deadlift: [1.2, 1.5, 1.9, 2.3, 2.6, 2.9, 3.1],
  overhead_press: [0.4, 0.6, 0.8, 1.0, 1.15, 1.3, 1.45],
  barbell_row: [0.6, 0.9, 1.2, 1.5, 1.7, 1.9, 2.1],
  pull_up: [0.0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85],
};

// Approved Women's standards table (Pull-up is unranked)
export const WOMEN_STANDARDS: Record<string, number[]> = {
  bench_press: [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.5],
  squat: [0.7, 0.9, 1.2, 1.5, 1.8, 2.0, 2.2],
  deadlift: [0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.5],
  overhead_press: [0.3, 0.4, 0.55, 0.7, 0.85, 1.0, 1.1],
  barbell_row: [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.5],
  pull_up: [], // Women's pull-up stays unranked
};

// Neutral standards table (Average of male and female thresholds)
export const NEUTRAL_STANDARDS: Record<string, number[]> = {
  bench_press: [0.55, 0.8, 1.05, 1.3, 1.5, 1.7, 1.85],
  squat: [0.85, 1.1, 1.4, 1.75, 2.05, 2.3, 2.5],
  deadlift: [1.0, 1.3, 1.65, 2.0, 2.3, 2.6, 2.8],
  overhead_press: [0.35, 0.5, 0.675, 0.85, 1.0, 1.15, 1.275],
  barbell_row: [0.5, 0.75, 1.0, 1.25, 1.45, 1.65, 1.8],
  pull_up: [0.0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85],
};

/**
 * Get active standards array based on gender:
 * 'male' -> MEN_STANDARDS
 * 'female' -> WOMEN_STANDARDS
 * unset/null -> NEUTRAL_STANDARDS (averaged)
 */
export function getStandardsForGender(
  gender: string | null | undefined
): { standards: Record<string, number[]>; isGenderUnset: boolean } {
  if (gender === "male") {
    return { standards: MEN_STANDARDS, isGenderUnset: false };
  }
  if (gender === "female") {
    return { standards: WOMEN_STANDARDS, isGenderUnset: false };
  }
  return { standards: NEUTRAL_STANDARDS, isGenderUnset: true };
}

/**
 * Epley 1RM formula: weight * (1 + reps / 30.0)
 * Strictly calculated only when reps <= 10.
 * If reps === 1, e1rm = weight.
 * If reps > 10, returns null.
 * For pull-up with 0 added weight (strict bodyweight): returns 0 (0 kg added).
 */
export function calculateEpley1RM(
  weightKg: number,
  reps: number,
  isPullUp = false
): number | null {
  if (reps <= 0) return null;
  if (reps > 10) return null; // Rule: strictly <= 10 reps

  if (isPullUp) {
    if (weightKg < 0) return null; // Assisted / banded is unranked
    if (weightKg === 0) return 0; // Strict bodyweight rep
  } else {
    if (weightKg <= 0) return null;
  }

  if (reps === 1) return weightKg;

  const e1rm = weightKg * (1 + reps / 30.0);
  return Math.round(e1rm * 10) / 10;
}

export function getTierColor(tierName: string) {
  const match = RANK_TIERS.find((t) => t.name.toLowerCase() === tierName.toLowerCase());
  return match?.color || UNRANKED_STYLE;
}

export interface TierEvaluation {
  tier: TierName;
  ratio: number;
  isUnranked: boolean;
  nextTier?: string;
  nextTargetKg?: number;
  kgToGo?: number;
  progressPercent: number;
  unrankedReason?: string;
}

/**
 * Determine rank tier based on exercise ID/key, 1RM, bodyweight, and gender standards
 */
export function determineTier(
  exerciseIdOrKey: string,
  e1rmKg: number,
  bodyweightKg: number,
  gender?: string | null
): TierEvaluation {
  if (bodyweightKg <= 0) {
    return {
      tier: "Unranked",
      ratio: 0,
      isUnranked: true,
      progressPercent: 0,
      unrankedReason: "Bodyweight is required to calculate rank",
    };
  }

  // Resolve canonical exercise key
  const canonical = CANONICAL_EXERCISES.find(
    (e) => e.id === exerciseIdOrKey || e.key === exerciseIdOrKey
  );
  const exerciseKey = canonical ? canonical.key : exerciseIdOrKey;

  // Women's pull-up is explicitly unranked
  if (exerciseKey === "pull_up" && gender === "female") {
    return {
      tier: "Unranked",
      ratio: 0,
      isUnranked: true,
      progressPercent: 0,
      unrankedReason: "Women's pull-up is unranked",
    };
  }

  // Assisted pull-up (< 0 added) is unranked
  if (exerciseKey === "pull_up" && e1rmKg < 0) {
    return {
      tier: "Unranked",
      ratio: 0,
      isUnranked: true,
      progressPercent: 0,
      unrankedReason: "Assisted variants are unranked",
    };
  }

  const { standards } = getStandardsForGender(gender);
  const multipliers = standards[exerciseKey];

  if (!multipliers || multipliers.length === 0) {
    return {
      tier: "Unranked",
      ratio: 0,
      isUnranked: true,
      progressPercent: 0,
      unrankedReason: "No standard defined",
    };
  }

  // Pull-up uses added weight only: ratio = added_e1rm / bodyweight
  const ratio = Math.round((e1rmKg / bodyweightKg) * 1000) / 1000;

  // Special rule for strict bodyweight pull-up (0 added weight):
  // Men's Bronze threshold is 0.0, so 0 added strictly ranks Bronze!
  if (exerciseKey === "pull_up" && e1rmKg === 0) {
    const nextStd = multipliers[1]; // Silver is 0.1
    const nextTargetKg = Math.round(nextStd * bodyweightKg * 10) / 10;
    return {
      tier: "Bronze",
      ratio: 0,
      isUnranked: false,
      nextTier: TIER_NAMES[1],
      nextTargetKg,
      kgToGo: nextTargetKg,
      progressPercent: 0,
    };
  }

  // Check if below Bronze threshold
  if (ratio < multipliers[0]) {
    const bronzeTargetKg = Math.round(multipliers[0] * bodyweightKg * 10) / 10;
    const kgToGo = Math.max(0, Math.round((bronzeTargetKg - e1rmKg) * 10) / 10);
    const progressPercent = multipliers[0] > 0
      ? Math.min(99, Math.round((ratio / multipliers[0]) * 100))
      : 0;

    return {
      tier: "Unranked",
      ratio,
      isUnranked: true,
      nextTier: "Bronze",
      nextTargetKg: bronzeTargetKg,
      kgToGo,
      progressPercent,
      unrankedReason: `Ratio below Bronze threshold (${multipliers[0]}x)`,
    };
  }

  // Walk through the 7 tiers
  let currentTier: TierName = "Bronze";
  let nextTier: string | undefined;
  let nextTargetKg: number | undefined;
  let kgToGo: number | undefined;
  let progressPercent = 0;

  for (let i = 0; i < multipliers.length; i++) {
    const tierMultiplier = multipliers[i];
    if (ratio >= tierMultiplier) {
      currentTier = TIER_NAMES[i];
    } else {
      nextTier = TIER_NAMES[i];
      nextTargetKg = Math.round(tierMultiplier * bodyweightKg * 10) / 10;
      kgToGo = Math.max(0, Math.round((nextTargetKg - e1rmKg) * 10) / 10);
      const prevMultiplier = multipliers[i - 1];
      const tierSpan = tierMultiplier - prevMultiplier;
      const progressInTier = ratio - prevMultiplier;
      progressPercent = Math.min(99, Math.round((progressInTier / tierSpan) * 100));
      break;
    }
  }

  // If at Mr. Olympia (highest tier)
  if (currentTier === "Mr. Olympia") {
    progressPercent = 100;
  }

  return {
    tier: currentTier,
    ratio,
    isUnranked: false,
    nextTier,
    nextTargetKg,
    kgToGo,
    progressPercent,
  };
}

/**
 * Overall Strength Rank:
 * Average the bodyweight RATIOS of the canonical ranked lifts logged.
 * Map the average ratio to an overall tier based on the averaged tier standards.
 */
export function calculateOverallRank(
  loggedLifts: { key: string; ratio: number }[],
  gender?: string | null
): {
  overallTier: TierName;
  averageRatio: number;
  liftsCount: number;
  maxLifts: number;
} {
  const validLifts = loggedLifts.filter((l) => l.ratio >= 0);
  const liftsCount = validLifts.length;
  const maxLifts = gender === "female" ? 5 : 6; // Women's pull-up is unranked

  if (liftsCount === 0) {
    return {
      overallTier: "Unranked",
      averageRatio: 0,
      liftsCount: 0,
      maxLifts,
    };
  }

  const { standards } = getStandardsForGender(gender);

  // Compute average user ratio
  const sumRatio = validLifts.reduce((acc, curr) => acc + curr.ratio, 0);
  const averageRatio = Math.round((sumRatio / liftsCount) * 1000) / 1000;

  // Compute average threshold ladder across the logged lifts
  const avgThresholds = TIER_NAMES.map((_, tierIdx) => {
    let tierSum = 0;
    let counted = 0;
    for (const lift of validLifts) {
      const mults = standards[lift.key];
      if (mults && mults[tierIdx] !== undefined) {
        tierSum += mults[tierIdx];
        counted++;
      }
    }
    return counted > 0 ? Math.round((tierSum / counted) * 1000) / 1000 : 0;
  });

  // Map average ratio to overall tier
  let overallTier: TierName = "Unranked";
  if (averageRatio >= avgThresholds[0]) {
    overallTier = "Bronze";
    for (let i = 0; i < avgThresholds.length; i++) {
      if (averageRatio >= avgThresholds[i]) {
        overallTier = TIER_NAMES[i];
      } else {
        break;
      }
    }
  }

  return {
    overallTier,
    averageRatio,
    liftsCount,
    maxLifts,
  };
}
