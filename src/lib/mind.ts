/**
 * Mind & Focus Sessions Engine (Stage 7a)
 * Pure math, presets, wall-clock telemetry, audio synth, and stats aggregation
 */

import { getLocalDateString } from "./nutrition";

export type FocusMode = "sprint_50" | "ultradian_90" | "pomodoro_25" | "custom";
export type SessionStatus = "completed" | "ended_early" | "abandoned";

export interface FocusModePreset {
  id: FocusMode;
  name: string;
  workMinutes: number;
  breakMinutes: number;
  description: string;
  badge: string;
}

export const FOCUS_PRESETS: Record<FocusMode, FocusModePreset> = {
  sprint_50: {
    id: "sprint_50",
    name: "Deep Sprint",
    workMinutes: 50,
    breakMinutes: 10,
    description: "50-minute focused sprint with a 10-minute renewal break",
    badge: "50 / 10",
  },
  ultradian_90: {
    id: "ultradian_90",
    name: "Ultradian Rhythm",
    workMinutes: 90,
    breakMinutes: 20,
    description: "90-minute sustained work interval with a 20-minute renewal break",
    badge: "90 / 20",
  },
  pomodoro_25: {
    id: "pomodoro_25",
    name: "Classic Pomodoro",
    workMinutes: 25,
    breakMinutes: 5,
    description: "25-minute focused interval with a 5-minute renewal break",
    badge: "25 / 5",
  },
  custom: {
    id: "custom",
    name: "Custom Interval",
    workMinutes: 45,
    breakMinutes: 15,
    description: "Custom user-defined focus and renewal intervals",
    badge: "Custom",
  },
};

// Item 8: Separate Task Categories
export const TASK_CATEGORIES = [
  "Coding",
  "Study",
  "Reading",
  "Writing",
  "Research",
  "Other",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number] | string;

// Item 8: Separate Friction Tags (Neutral Wording)
export const FRICTION_TAGS = [
  "Deep flow",
  "High resistance",
  "Phone distraction",
  "Low energy",
  "Context switching",
] as const;

export type FrictionTag = (typeof FRICTION_TAGS)[number] | string;

export interface FocusSession {
  id: string;
  user_id?: string;
  subject_id?: string | null;
  task_category: string;
  task_name: string;
  mode: FocusMode;
  planned_minutes: number;
  actual_minutes: number;
  paused_seconds: number;
  status: SessionStatus;
  rating?: number | null; // 1 - 5
  friction_tags: string[];
  notes?: string | null;
  started_at: string;
  ended_at: string;
  logged_date: string;
  created_at?: string;
  deleted_at?: string | null;
}

/**
 * Wall-clock remaining seconds calculation
 * Prevents timer freezing when browser tab is inactive or phone sleeps
 */
export function calculateRemainingSeconds(
  targetEndTimeMs: number,
  pausedAtMs?: number | null,
  nowMs: number = Date.now()
): number {
  if (pausedAtMs && pausedAtMs > 0) {
    const diffMs = targetEndTimeMs - pausedAtMs;
    return Math.max(0, Math.ceil(diffMs / 1000));
  }
  const diffMs = targetEndTimeMs - nowMs;
  return Math.max(0, Math.ceil(diffMs / 1000));
}

/**
 * Resumes timer after pause, pushing the target end time forward
 * by the elapsed paused seconds
 */
export function resumeSessionTimer(
  targetEndTimeMs: number,
  pausedAtMs: number,
  currentTotalPausedSec: number,
  resumeTimeMs: number = Date.now()
): { newTargetEndTimeMs: number; newTotalPausedSeconds: number } {
  const pauseDurationSec = Math.max(
    0,
    Math.round((resumeTimeMs - pausedAtMs) / 1000)
  );
  const newTotalPausedSeconds = currentTotalPausedSec + pauseDurationSec;
  const newTargetEndTimeMs = targetEndTimeMs + pauseDurationSec * 1000;
  return { newTargetEndTimeMs, newTotalPausedSeconds };
}

/**
 * Formats seconds into MM:SS
 */
export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  const ss = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${ss}`;
}

/**
 * Calculates session progress ratio (0.0 to 1.0)
 */
export function calculateSessionProgress(
  elapsedSeconds: number,
  totalSeconds: number
): number {
  if (totalSeconds <= 0) return 1.0;
  return Math.min(1.0, Math.max(0, elapsedSeconds / totalSeconds));
}

/**
 * Derives logged_date from the session start timestamp in the user's timezone.
 * Handles midnight crossing correctly (session started before midnight belongs to that date).
 */
export function deriveSessionLoggedDate(
  startedAtIso: string,
  userTimezone: string
): string {
  const startDate = new Date(startedAtIso);
  return getLocalDateString(startDate, userTimezone);
}

/**
 * Item 4: Focus Score Formula
 * Focus score = minutes vs goal plus average rating of rated sessions.
 * Label: "Focus score (from your sessions)"
 * With no sessions show null (rendered as "No sessions yet").
 *
 * Formula:
 * - Minutes component (up to 70 pts): min(70, (actual_minutes / goal) * 70)
 * - Quality / Rating component (up to 30 pts): (avg_rating / 5) * 30 (or neutral 15 pts if unrated)
 */
export function calculateFocusScore(
  sessions: FocusSession[],
  dailyGoalMinutes: number | null | undefined
): {
  score: number | null;
  totalActualMinutes: number;
  completedCount: number;
  averageRating: number | null;
  goalProgressPercent: number | null;
  tagCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  label: string;
  hasGoal: boolean;
  hasRatings: boolean;
} {
  const activeSessions = sessions.filter((s) => !s.deleted_at);

  const hasGoal = typeof dailyGoalMinutes === "number" && dailyGoalMinutes > 0;

  if (activeSessions.length === 0) {
    return {
      score: null,
      totalActualMinutes: 0,
      completedCount: 0,
      averageRating: null,
      goalProgressPercent: null,
      tagCounts: {},
      categoryCounts: {},
      label: "No sessions yet",
      hasGoal,
      hasRatings: false,
    };
  }

  let totalActualMinutes = 0;
  let completedCount = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  const tagCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  for (const s of activeSessions) {
    totalActualMinutes += s.actual_minutes;
    if (s.status === "completed") {
      completedCount++;
    }
    if (typeof s.rating === "number" && s.rating >= 1 && s.rating <= 5) {
      ratingSum += s.rating;
      ratingCount++;
    }
    if (s.task_category) {
      categoryCounts[s.task_category] = (categoryCounts[s.task_category] || 0) + 1;
    }
    for (const tag of s.friction_tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const averageRating =
    ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;
  const hasRatings = ratingCount > 0;

  const goalProgressPercent = hasGoal
    ? Math.min(100, Math.round((totalActualMinutes / dailyGoalMinutes!) * 100))
    : null;

  let score: number | null = null;
  let label = "Focus score (from your sessions)";

  if (!hasGoal && !hasRatings) {
    // Goal not set and no ratings: cannot compute volume or quality
    score = null;
    label = "Set a goal";
  } else if (!hasGoal && hasRatings) {
    // Goal not set: volume component NOT computed. Rating quality only.
    score = Math.round((averageRating! / 5) * 100);
    label = "Focus score (quality only - set a goal)";
  } else if (hasGoal && !hasRatings) {
    // No rated sessions: compute from volume ONLY (no neutral 15 points!)
    score = Math.min(100, Math.round((totalActualMinutes / dailyGoalMinutes!) * 100));
    label = "Focus score (volume only - unrated)";
  } else if (hasGoal && hasRatings) {
    // Both goal and ratings present: 70 pts volume + 30 pts quality
    const volumePts = Math.min(70, (totalActualMinutes / dailyGoalMinutes!) * 70);
    const qualityPts = (averageRating! / 5) * 30;
    score = Math.min(100, Math.round(volumePts + qualityPts));
    label = "Focus score (from your sessions)";
  }

  return {
    score,
    totalActualMinutes,
    completedCount,
    averageRating,
    goalProgressPercent,
    tagCounts,
    categoryCounts,
    label,
    hasGoal,
    hasRatings,
  };
}

/**
 * Web Audio API Harmonic Chime Synthesizer & Vibration
 * Native in-memory audio oscillator with volume control and haptic feedback
 */
export function playHarmonicChime(
  type: "work_complete" | "break_complete" | "tick" = "work_complete",
  volumePct: number = 80,
  vibrationEnabled: boolean = true
): void {
  if (typeof window === "undefined") return;

  // Haptic feedback
  if (vibrationEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "work_complete") {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } else if (type === "break_complete") {
        navigator.vibrate([150, 100, 150]);
      }
    } catch {
      // ignore mobile vibration errors
    }
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gainScale = Math.max(0, Math.min(1, volumePct / 100));

    if (gainScale <= 0) return;

    if (type === "work_complete") {
      // Harmonic Triad Bell (C5, E5, G5, C6) - Rewarding harmonic bell
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        const targetGain = 0.15 * gainScale;
        gain.gain.setValueAtTime(0, now + index * 0.08);
        gain.gain.linearRampToValueAtTime(targetGain, now + index * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 1.85);
      });
    } else if (type === "break_complete") {
      // Awakening Bell (A4, E5, A5) - Calm transition back to focus
      const freqs = [440.0, 659.25, 880.0];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        const targetGain = 0.12 * gainScale;
        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(targetGain, now + index * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.1 + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 1.55);
      });
    }
  } catch (e) {
    console.warn("Web Audio API chime error:", e);
  }
}
