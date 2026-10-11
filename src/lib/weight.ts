// Weight, BMI, and Body Composition Helpers

export interface WeightLogEntry {
  id: string;
  weight_kg: number;
  occurred_at: string;
  note?: string;
}

export type GoalType = "cut" | "bulk" | "recomp";

export interface WeightProfile {
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  goal_type: GoalType;
  height_cm: number | null;
}

/**
 * Calculate BMI: weight (kg) / (height (m) ^ 2)
 */
export function calculateBMI(weightKg: number, heightCm: number | null): {
  bmi: number | null;
  category: string;
} {
  if (!heightCm || heightCm <= 0 || weightKg <= 0) {
    return { bmi: null, category: "Unknown" };
  }

  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal weight";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";

  return { bmi, category };
}

/**
 * Calculate 7-day Exponential Moving Average or Rolling Average
 */
export function calculateMovingAverage(
  entries: WeightLogEntry[],
  windowDays = 7
): { date: string; weight: number; movingAvg: number }[] {
  if (entries.length === 0) return [];

  // Sort ascending by date
  const sorted = [...entries].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );

  const results: { date: string; weight: number; movingAvg: number }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const currentDate = new Date(current.occurred_at);

    // Filter entries within the rolling window
    const windowStart = new Date(currentDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const windowEntries = sorted.slice(0, i + 1).filter(
      (e) => new Date(e.occurred_at) >= windowStart
    );

    const sum = windowEntries.reduce((acc, curr) => acc + curr.weight_kg, 0);
    const avg = Math.round((sum / windowEntries.length) * 10) / 10;

    results.push({
      date: currentDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      weight: current.weight_kg,
      movingAvg: avg,
    });
  }

  return results;
}

/**
 * Calculate Weekly Rate of Change (kg/week)
 */
export function calculateRateOfChange(
  entries: WeightLogEntry[],
  daysLookback = 14
): number | null {
  if (entries.length < 2) return null;

  const sorted = [...entries].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  const latest = sorted[0];
  const latestTime = new Date(latest.occurred_at).getTime();
  const cutoffTime = latestTime - daysLookback * 24 * 60 * 60 * 1000;

  const olderEntries = sorted.filter(
    (e) => new Date(e.occurred_at).getTime() <= cutoffTime
  );

  const reference = olderEntries.length > 0 ? olderEntries[0] : sorted[sorted.length - 1];

  const diffTimeMs = latestTime - new Date(reference.occurred_at).getTime();
  const diffDays = diffTimeMs / (1000 * 60 * 60 * 24);

  if (diffDays < 2) return null; // Not enough elapsed time

  const diffKg = latest.weight_kg - reference.weight_kg;
  const weeklyRate = (diffKg / diffDays) * 7;

  return Math.round(weeklyRate * 100) / 100;
}
