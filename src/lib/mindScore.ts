/**
 * Composite Mind Score Engine (Stage 7c)
 * Multi-domain cognitive synthesis: Focus, Discipline, Math, Reading, Screen Time
 * Pure math, explainable breakdown, honest null zero state (no fake defaults)
 */

export interface MindScoreInput {
  focusMinutes: number;
  focusGoalMinutes?: number | null;
  focusRatingAvg?: number | null;
  disciplineCompleted: number;
  disciplineTotal: number;
  mathAccuracyPct?: number | null;
  mathSessionsCount: number;
  readingPages: number;
  readingMinutes?: number | null;
  screenTime?: {
    totalMinutes: number;
    productiveMinutes: number;
    entertainmentMinutes: number;
  } | null;
}

export interface MindScoreBreakdown {
  focusPts: number;
  disciplinePts: number;
  mathPts: number;
  readingPts: number;
  screenTimePts: number;
  totalScore: number | null;
  label: string;
  hasActivity: boolean;
}

/**
 * Calculate the daily composite Mind Score (0 - 100)
 */
export function calculateCompositeMindScore(input: MindScoreInput): MindScoreBreakdown {
  const hasFocus = input.focusMinutes > 0;
  const hasDiscipline = input.disciplineTotal > 0;
  const hasMath = input.mathSessionsCount > 0;
  const hasReading = input.readingPages > 0 || (input.readingMinutes || 0) > 0;
  const hasScreenTime = input.screenTime !== null && input.screenTime !== undefined;

  const hasActivity = hasFocus || hasDiscipline || hasMath || hasReading || hasScreenTime;

  // Honest zero state: if user has logged nothing today, return null
  if (!hasActivity) {
    return {
      focusPts: 0,
      disciplinePts: 0,
      mathPts: 0,
      readingPts: 0,
      screenTimePts: 0,
      totalScore: null,
      label: "No telemetry today",
      hasActivity: false,
    };
  }

  // 1. Focus Deep Work component (max 35 pts)
  let focusPts = 0;
  if (hasFocus) {
    const goal = input.focusGoalMinutes || 180;
    const volumeRatio = Math.min(1.0, input.focusMinutes / goal);
    const qualityMultiplier = input.focusRatingAvg ? input.focusRatingAvg / 5 : 0.8;
    focusPts = Math.round(volumeRatio * 35 * qualityMultiplier);
  }

  // 2. Discipline Commitments component (max 25 pts)
  let disciplinePts = 0;
  if (hasDiscipline) {
    const ratio = Math.min(1.0, input.disciplineCompleted / input.disciplineTotal);
    disciplinePts = Math.round(ratio * 25);
  }

  // 3. Mental Math Agility component (max 15 pts)
  let mathPts = 0;
  if (hasMath) {
    const accuracy = input.mathAccuracyPct !== null && input.mathAccuracyPct !== undefined ? input.mathAccuracyPct : 70;
    mathPts = Math.round((accuracy / 100) * 15);
  }

  // 4. Mindful Reading component (max 15 pts)
  let readingPts = 0;
  if (hasReading) {
    // 20 pages or 30 minutes earns full 15 pts
    const pageRatio = Math.min(1.0, input.readingPages / 20);
    const minRatio = Math.min(1.0, (input.readingMinutes || 0) / 30);
    const bestRatio = Math.max(pageRatio, minRatio);
    readingPts = Math.round(bestRatio * 15);
  }

  // 5. Screen Time Balance component (max 10 pts)
  let screenTimePts = 0;
  if (hasScreenTime && input.screenTime) {
    const total = input.screenTime.totalMinutes;
    if (total > 0) {
      const prodRatio = input.screenTime.productiveMinutes / total;
      const entRatio = input.screenTime.entertainmentMinutes / total;
      if (prodRatio >= 0.5) screenTimePts = 10;
      else if (entRatio >= 0.6) screenTimePts = 3;
      else screenTimePts = 7;
    } else {
      screenTimePts = 10; // 0 screen time
    }
  }

  const rawTotal = focusPts + disciplinePts + mathPts + readingPts + screenTimePts;
  const totalScore = Math.min(100, Math.max(0, rawTotal));

  let label = "Building Momentum";
  if (totalScore >= 85) label = "Elite Cognitive State";
  else if (totalScore >= 70) label = "Strong Focus Day";
  else if (totalScore >= 50) label = "Solid Baseline";

  return {
    focusPts,
    disciplinePts,
    mathPts,
    readingPts,
    screenTimePts,
    totalScore,
    label,
    hasActivity: true,
  };
}
