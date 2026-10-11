/**
 * Sleep & Circadian Telemetry Engine
 * Obsidian Kinetic Design System - Life Web App
 */

export interface SleepEntry {
  id: string;
  user_id?: string;
  sleep_date: string; // YYYY-MM-DD
  bedtime: string; // ISO string
  wake_time: string; // ISO string
  duration_minutes: number;
  quality_rating?: number | null; // 1 to 5
  awakenings_count?: number;
  nap_minutes?: number;
  notes?: string;
  created_at?: string;
  deleted_at?: string | null;
}

export interface SleepScoreResult {
  score: number; // 0 to 100
  tier: "Strong" | "Good" | "Poor";
  label: "Sleep score (from your log)";
  colorToken: string; // Tailwind token or hex
  hexColor: string;
  iconName: "Sparkles" | "Moon" | "AlertTriangle";
  durationPts: number;
  ratingPts: number;
  awakeningsPts: number;
}

export interface CircularMidpointResult {
  meanMidpointMinutes: number; // Minutes from midnight [0, 1440)
  meanMidpointFormatted: string; // e.g. "03:15 AM"
  stdDevMinutes: number; // Circular standard deviation in minutes
  stability: "Consistent" | "Moderate" | "Irregular";
}

/**
 * Calculates sleep duration in minutes, safely wrapping past midnight.
 * Duration must be between 60m and 960m (1h to 16h).
 */
export function calculateSleepDuration(
  bedtimeIso: string,
  wakeTimeIso: string
): { durationMinutes: number; durationFormatted: string; isValid: boolean; error?: string } {
  const bedDate = new Date(bedtimeIso);
  const wakeDate = new Date(wakeTimeIso);

  if (isNaN(bedDate.getTime()) || isNaN(wakeDate.getTime())) {
    return { durationMinutes: 0, durationFormatted: "0h 0m", isValid: false, error: "Invalid date format" };
  }

  let diffMs = wakeDate.getTime() - bedDate.getTime();

  // If wake time is earlier or equal to bedtime on same calendar day, it wrapped past midnight
  if (diffMs <= 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }

  const durationMinutes = Math.round(diffMs / (60 * 1000));

  if (durationMinutes < 60) {
    return { durationMinutes, durationFormatted: `${durationMinutes}m`, isValid: false, error: "Sleep duration must be at least 1 hour (60 min)" };
  }

  if (durationMinutes > 960) {
    return { durationMinutes, durationFormatted: `${Math.floor(durationMinutes / 60)}h`, isValid: false, error: "Sleep duration cannot exceed 16 hours (960 min)" };
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationFormatted = `${hours}h ${minutes}m`;

  return { durationMinutes, durationFormatted, isValid: true };
}

/**
 * Calculates the single-night midpoint in minutes from midnight [0, 1440)
 */
export function getSingleNightMidpointMinutes(bedtimeIso: string, wakeTimeIso: string): number {
  const bedDate = new Date(bedtimeIso);
  const wakeDate = new Date(wakeTimeIso);
  let diffMs = wakeDate.getTime() - bedDate.getTime();
  if (diffMs <= 0) diffMs += 24 * 60 * 60 * 1000;

  const midpointMs = bedDate.getTime() + diffMs / 2;
  const midDate = new Date(midpointMs);
  return midDate.getHours() * 60 + midDate.getMinutes();
}

/**
 * Calculates Sleep Score (0 - 100)
 * Weighted Formula:
 * 1. Duration (50 pts): Target 8.0h (480m). Full points for 7h-9h (420m - 540m).
 * 2. Quality Rating (30 pts): Subjective 1 to 5 (6 pts per star). Default 18 (3 stars) if null.
 * 3. Continuity / Awakenings (20 pts): 20 pts minus 5 pts per awakening, minimum 0.
 *
 * Visual Tokens & Color Boundaries:
 * - Score >= 85: Strong (Lime `#C6FF3D`, icon Sparkles)
 * - Score 50 to 84: Good (Ice Blue `#7DD3FC`, icon Moon)
 * - Score < 50: Poor (Red `#F87171`, icon AlertTriangle)
 */
export function calculateSleepScore(
  durationMinutes: number,
  targetHours: number = 8.0,
  qualityRating?: number | null,
  awakeningsCount: number = 0
): SleepScoreResult {
  if (durationMinutes <= 0) {
    return {
      score: 0,
      tier: "Poor",
      label: "Sleep score (from your log)",
      colorToken: "text-[#F87171]",
      hexColor: "#F87171",
      iconName: "AlertTriangle",
      durationPts: 0,
      ratingPts: 0,
      awakeningsPts: 0,
    };
  }

  const targetMinutes = targetHours * 60;

  // 1. Duration Points (max 50)
  let durationPts = 0;
  if (durationMinutes >= 420 && durationMinutes <= 540) {
    durationPts = 50;
  } else if (durationMinutes < 420) {
    // Scales linearly from 240m (4h = 0 pts) to 420m (7h = 50 pts)
    const scale = (durationMinutes - 240) / 180;
    durationPts = Math.max(0, Math.min(50, Math.round(scale * 50)));
  } else {
    // Oversleeping (>9h): slight gradual drop
    const excess = durationMinutes - 540;
    durationPts = Math.max(25, 50 - Math.round(excess * 0.1));
  }

  // 2. Rating Points (max 30)
  let ratingPts = 18; // Default 3/5 when null
  if (qualityRating !== undefined && qualityRating !== null && qualityRating >= 1 && qualityRating <= 5) {
    ratingPts = Math.round((qualityRating / 5) * 30);
  }

  // 3. Continuity / Awakenings Points (max 20)
  const awake = Math.max(0, awakeningsCount || 0);
  const awakeningsPts = Math.max(0, 20 - awake * 5);

  const total = Math.max(0, Math.min(100, durationPts + ratingPts + awakeningsPts));

  let tier: "Strong" | "Good" | "Poor" = "Good";
  let colorToken = "text-[#7DD3FC]";
  let hexColor = "#7DD3FC";
  let iconName: "Sparkles" | "Moon" | "AlertTriangle" = "Moon";

  if (total >= 85) {
    tier = "Strong";
    colorToken = "text-primary-lime";
    hexColor = "#C6FF3D";
    iconName = "Sparkles";
  } else if (total >= 50) {
    tier = "Good";
    colorToken = "text-[#7DD3FC]";
    hexColor = "#7DD3FC";
    iconName = "Moon";
  } else {
    tier = "Poor";
    colorToken = "text-[#F87171]";
    hexColor = "#F87171";
    iconName = "AlertTriangle";
  }

  return {
    score: total,
    tier,
    label: "Sleep score (from your log)",
    colorToken,
    hexColor,
    iconName,
    durationPts,
    ratingPts,
    awakeningsPts,
  };
}

/**
 * Calculates Circular Statistics for Sleep Midpoint Consistency.
 * Correctly avoids linear midpoint distortion across midnight (e.g., 23:30 and 00:30 average to 00:00 midnight).
 */
export function calculateCircularMidpointConsistency(
  entries: SleepEntry[]
): CircularMidpointResult {
  const activeEntries = (entries || []).filter((e) => !e.deleted_at && e.bedtime && e.wake_time);

  if (activeEntries.length === 0) {
    return {
      meanMidpointMinutes: 210, // 03:30 AM baseline
      meanMidpointFormatted: "03:30 AM",
      stdDevMinutes: 0,
      stability: "Consistent",
    };
  }

  let sumCos = 0;
  let sumSin = 0;

  for (const entry of activeEntries) {
    const mins = getSingleNightMidpointMinutes(entry.bedtime, entry.wake_time);
    const theta = (mins / 1440) * 2 * Math.PI;
    sumCos += Math.cos(theta);
    sumSin += Math.sin(theta);
  }

  const n = activeEntries.length;
  const meanCos = sumCos / n;
  const meanSin = sumSin / n;

  // Mean angle theta
  let meanTheta = Math.atan2(meanSin, meanCos);
  if (meanTheta < 0) meanTheta += 2 * Math.PI;

  const meanMins = Math.round((meanTheta / (2 * Math.PI)) * 1440) % 1440;

  // Circular standard deviation
  const R = Math.sqrt(meanCos * meanCos + meanSin * meanSin);
  let stdDevMins = 0;
  if (R < 1 && R > 0.0001) {
    const angularStd = Math.sqrt(-2 * Math.log(R));
    stdDevMins = Math.round((angularStd / (2 * Math.PI)) * 1440);
  }

  // Format time
  const h = Math.floor(meanMins / 60);
  const m = meanMins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHours = h % 12 || 12;
  const displayMins = m.toString().padStart(2, "0");
  const meanMidpointFormatted = `${displayHours}:${displayMins} ${ampm}`;

  let stability: "Consistent" | "Moderate" | "Irregular" = "Consistent";
  if (stdDevMins > 60) {
    stability = "Irregular";
  } else if (stdDevMins > 30) {
    stability = "Moderate";
  }

  return {
    meanMidpointMinutes: meanMins,
    meanMidpointFormatted,
    stdDevMinutes: stdDevMins,
    stability,
  };
}

/**
 * Calculates Typical "Same as Usual" times based on past 7 entries
 */
export function getTypicalTimes(entries: SleepEntry[]): {
  typicalBedtime: string; // "HH:MM"
  typicalWakeTime: string; // "HH:MM"
  hasData: boolean;
} {
  const recent = (entries || [])
    .filter((e) => !e.deleted_at && e.bedtime && e.wake_time)
    .slice(0, 7);

  if (recent.length === 0) {
    return { typicalBedtime: "23:00", typicalWakeTime: "07:00", hasData: false };
  }

  // Use circular average for bedtime
  let bedCos = 0;
  let bedSin = 0;
  let wakeCos = 0;
  let wakeSin = 0;

  for (const e of recent) {
    const b = new Date(e.bedtime);
    const w = new Date(e.wake_time);
    const bMins = b.getHours() * 60 + b.getMinutes();
    const wMins = w.getHours() * 60 + w.getMinutes();

    const bTheta = (bMins / 1440) * 2 * Math.PI;
    const wTheta = (wMins / 1440) * 2 * Math.PI;

    bedCos += Math.cos(bTheta);
    bedSin += Math.sin(bTheta);
    wakeCos += Math.cos(wTheta);
    wakeSin += Math.sin(wTheta);
  }

  let bTheta = Math.atan2(bedSin / recent.length, bedCos / recent.length);
  if (bTheta < 0) bTheta += 2 * Math.PI;
  const bMins = Math.round((bTheta / (2 * Math.PI)) * 1440) % 1440;

  let wTheta = Math.atan2(wakeSin / recent.length, wakeCos / recent.length);
  if (wTheta < 0) wTheta += 2 * Math.PI;
  const wMins = Math.round((wTheta / (2 * Math.PI)) * 1440) % 1440;

  const bH = String(Math.floor(bMins / 60)).padStart(2, "0");
  const bM = String(bMins % 60).padStart(2, "0");
  const wH = String(Math.floor(wMins / 60)).padStart(2, "0");
  const wM = String(wMins % 60).padStart(2, "0");

  return {
    typicalBedtime: `${bH}:${bM}`,
    typicalWakeTime: `${wH}:${wM}`,
    hasData: true,
  };
}

/**
 * Calculates 7-day rolling statistics
 */
export function calculateSleepStats(entries: SleepEntry[], targetHours: number = 8.0) {
  const active = (entries || []).filter((e) => !e.deleted_at);
  if (active.length === 0) {
    return {
      avgDurationMinutes: 0,
      avgDurationFormatted: "0h 0m",
      avgScore: 0,
      scoreTier: "Good" as const,
      colorToken: "text-[#7DD3FC]",
      hexColor: "#7DD3FC",
      totalNapsMinutes: 0,
      count: 0,
    };
  }

  const slice = active.slice(0, 7);
  const totalDuration = slice.reduce((acc, curr) => acc + curr.duration_minutes, 0);
  const totalNaps = slice.reduce((acc, curr) => acc + (curr.nap_minutes || 0), 0);
  const avgDurationMinutes = Math.round(totalDuration / slice.length);

  const scores = slice.map((e) =>
    calculateSleepScore(e.duration_minutes, targetHours, e.quality_rating, e.awakenings_count).score
  );
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / slice.length);

  const hours = Math.floor(avgDurationMinutes / 60);
  const mins = avgDurationMinutes % 60;

  const scoreObj = calculateSleepScore(avgDurationMinutes, targetHours, 4, 0);

  return {
    avgDurationMinutes,
    avgDurationFormatted: `${hours}h ${mins}m`,
    avgScore,
    scoreTier: scoreObj.tier,
    colorToken: scoreObj.colorToken,
    hexColor: scoreObj.hexColor,
    totalNapsMinutes: totalNaps,
    count: slice.length,
  };
}
