/**
 * Weight & Body Composition Analytics Engine
 * Obsidian Kinetic Design System - Life Web App
 */

export type GoalType = "cut" | "bulk" | "recomp";

export interface WeightLogEntry {
  id: string;
  weight_kg: number;
  logged_at: string; // ISO string
  note?: string;
  deleted_at?: string | null;
}

export interface CollapsedDailyWeight {
  date: string; // YYYY-MM-DD
  weight_kg: number;
  rawCount: number;
  latestId: string;
  latestLoggedAt: string;
}

export interface MovingAveragePoint {
  date: string; // YYYY-MM-DD
  rawWeight: number;
  movingAvg: number;
}

export interface RateOfChangeResult {
  rateKgPerWeek: number | null;
  status: "Calibrating" | "Active";
  entryCount: number;
  daySpan: number;
}

export interface ProjectedGoalResult {
  projectedDate: string | null;
  weeksRemaining: number | null;
  statusText: string;
}

export interface DeltaSemantic {
  isPositive: boolean;
  colorToken: string;
  label: string;
}

/**
 * 1. Collapse multiple weigh-ins on the same calendar day into a single daily average
 */
export function collapseDailyWeights(entries: WeightLogEntry[]): CollapsedDailyWeight[] {
  if (!entries || entries.length === 0) return [];

  // Group non-deleted entries by local calendar date (YYYY-MM-DD)
  const grouped = new Map<
    string,
    { sum: number; count: number; latestId: string; latestTime: number; latestIso: string }
  >();

  for (const entry of entries) {
    if (entry.deleted_at) continue;

    const d = new Date(entry.logged_at);
    // Local date string key YYYY-MM-DD
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

    const time = d.getTime();
    const existing = grouped.get(dateKey);

    if (!existing) {
      grouped.set(dateKey, {
        sum: entry.weight_kg,
        count: 1,
        latestId: entry.id,
        latestTime: time,
        latestIso: entry.logged_at,
      });
    } else {
      existing.sum += entry.weight_kg;
      existing.count += 1;
      if (time > existing.latestTime) {
        existing.latestTime = time;
        existing.latestId = entry.id;
        existing.latestIso = entry.logged_at;
      }
    }
  }

  // Convert to sorted array (chronological: oldest to newest)
  const collapsed: CollapsedDailyWeight[] = [];
  grouped.forEach((val, date) => {
    collapsed.push({
      date,
      weight_kg: Math.round((val.sum / val.count) * 100) / 100,
      rawCount: val.count,
      latestId: val.latestId,
      latestLoggedAt: val.latestIso,
    });
  });

  return collapsed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * 2. Calculate 7-Day Rolling Moving Average from collapsed daily values
 */
export function calculateMovingAverage(
  dailyEntries: CollapsedDailyWeight[],
  windowDays: number = 7
): MovingAveragePoint[] {
  if (!dailyEntries || dailyEntries.length === 0) return [];

  const results: MovingAveragePoint[] = [];

  for (let i = 0; i < dailyEntries.length; i++) {
    const current = dailyEntries[i];
    const currentDate = new Date(current.date).getTime();
    const windowStart = currentDate - (windowDays - 1) * 24 * 60 * 60 * 1000;

    // Filter all daily entries in [currentDate - (windowDays - 1), currentDate]
    const windowItems = dailyEntries
      .slice(0, i + 1)
      .filter((e) => new Date(e.date).getTime() >= windowStart);

    const sum = windowItems.reduce((acc, curr) => acc + curr.weight_kg, 0);
    const avg = Math.round((sum / windowItems.length) * 10) / 10;

    results.push({
      date: current.date,
      rawWeight: current.weight_kg,
      movingAvg: avg,
    });
  }

  return results;
}

/**
 * 3. Weekly Rate of Change (kg/week)
 * Requires at least 4 entries spanning at least 7 days within a 14-day lookback window.
 * Computes the slope via Ordinary Least Squares (OLS) linear regression over elapsed days.
 */
export function calculateRateOfChange(
  dailyEntries: CollapsedDailyWeight[],
  lookbackDays: number = 14
): RateOfChangeResult {
  if (!dailyEntries || dailyEntries.length < 4) {
    return { rateKgPerWeek: null, status: "Calibrating", entryCount: dailyEntries?.length || 0, daySpan: 0 };
  }

  const latest = dailyEntries[dailyEntries.length - 1];
  const latestTime = new Date(latest.date).getTime();
  const cutoffTime = latestTime - lookbackDays * 24 * 60 * 60 * 1000;

  // Filter entries in window
  const windowEntries = dailyEntries.filter((e) => new Date(e.date).getTime() >= cutoffTime);

  if (windowEntries.length < 4) {
    return {
      rateKgPerWeek: null,
      status: "Calibrating",
      entryCount: windowEntries.length,
      daySpan: 0,
    };
  }

  const earliestTime = new Date(windowEntries[0].date).getTime();
  const daySpan = Math.round((latestTime - earliestTime) / (24 * 60 * 60 * 1000));

  // Must span at least 7 calendar days to eliminate acute water weight noise
  if (daySpan < 7) {
    return {
      rateKgPerWeek: null,
      status: "Calibrating",
      entryCount: windowEntries.length,
      daySpan,
    };
  }

  // Linear Regression (OLS)
  // x = elapsed days from earliestTime, y = weight_kg
  const n = windowEntries.length;
  let sumX = 0;
  let sumY = 0;
  const xVals: number[] = [];
  const yVals: number[] = [];

  for (let i = 0; i < n; i++) {
    const elapsedDays = (new Date(windowEntries[i].date).getTime() - earliestTime) / (24 * 60 * 60 * 1000);
    xVals.push(elapsedDays);
    yVals.push(windowEntries[i].weight_kg);
    sumX += elapsedDays;
    sumY += windowEntries[i].weight_kg;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xVals[i] - meanX) * (yVals[i] - meanY);
    denominator += Math.pow(xVals[i] - meanX, 2);
  }

  if (denominator === 0) {
    return { rateKgPerWeek: 0, status: "Active", entryCount: n, daySpan };
  }

  const slopePerDay = numerator / denominator;
  const rateKgPerWeek = Math.round(slopePerDay * 7 * 100) / 100;

  return {
    rateKgPerWeek,
    status: "Active",
    entryCount: n,
    daySpan,
  };
}

/**
 * 4. Shared Goal-Aware Semantics Helper
 * Weight loss is desirable for Cut, undesirable for Bulk.
 */
export function getGoalAwareDeltaSemantic(
  deltaKg: number | null,
  goalType: GoalType
): DeltaSemantic {
  if (deltaKg === null || Math.abs(deltaKg) < 0.05) {
    return { isPositive: true, colorToken: "text-text-muted", label: "Stable" };
  }

  if (goalType === "cut") {
    const isGood = deltaKg < 0;
    return {
      isPositive: isGood,
      colorToken: isGood ? "text-primary-lime" : "text-rank-bronze",
      label: isGood ? "On Track (Loss)" : "Gain Warning",
    };
  } else if (goalType === "bulk") {
    const isGood = deltaKg > 0;
    return {
      isPositive: isGood,
      colorToken: isGood ? "text-primary-lime" : "text-rank-bronze",
      label: isGood ? "On Track (Surplus)" : "Deficit Warning",
    };
  } else {
    // recomp: near zero is good
    const isStable = Math.abs(deltaKg) <= 0.25;
    return {
      isPositive: isStable,
      colorToken: isStable ? "text-primary-lime" : "text-text-muted",
      label: isStable ? "Recomp Stable" : "Fluctuating",
    };
  }
}

/**
 * 5. Projected Goal Date Calculator
 * Shown only when rate is not Calibrating.
 */
export function calculateProjectedGoalDate(
  currentWeightKg: number,
  targetWeightKg: number,
  rateKgPerWeek: number | null,
  goalType: GoalType
): ProjectedGoalResult {
  if (rateKgPerWeek === null || Math.abs(rateKgPerWeek) < 0.05) {
    return { projectedDate: null, weeksRemaining: null, statusText: "Calibrating" };
  }

  const weightDelta = targetWeightKg - currentWeightKg;

  if (goalType === "cut") {
    if (weightDelta >= 0) {
      return { projectedDate: null, weeksRemaining: 0, statusText: "Target Reached" };
    }
    if (rateKgPerWeek >= 0) {
      return { projectedDate: null, weeksRemaining: null, statusText: "Rate Inverted (Gain)" };
    }
    const weeks = Math.abs(weightDelta) / Math.abs(rateKgPerWeek);
    const ms = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
    const projectedDate = new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return {
      projectedDate,
      weeksRemaining: Math.round(weeks * 10) / 10,
      statusText: `${projectedDate} (~${Math.round(weeks)} wks)`,
    };
  }

  if (goalType === "bulk") {
    if (weightDelta <= 0) {
      return { projectedDate: null, weeksRemaining: 0, statusText: "Target Reached" };
    }
    if (rateKgPerWeek <= 0) {
      return { projectedDate: null, weeksRemaining: null, statusText: "Rate Inverted (Loss)" };
    }
    const weeks = weightDelta / rateKgPerWeek;
    const ms = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
    const projectedDate = new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return {
      projectedDate,
      weeksRemaining: Math.round(weeks * 10) / 10,
      statusText: `${projectedDate} (~${Math.round(weeks)} wks)`,
    };
  }

  return { projectedDate: null, weeksRemaining: null, statusText: "Recomp Maintenance" };
}

/**
 * 6. Body Mass Index (BMI) - Secondary metric without judgment colors or clinical wording
 */
export function calculateBMI(
  weightKg: number,
  heightCm: number | null
): { bmi: number | null; category: string } {
  if (!heightCm || heightCm <= 0 || weightKg <= 0) {
    return { bmi: null, category: "Unset" };
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
