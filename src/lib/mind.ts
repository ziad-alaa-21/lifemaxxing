/**
 * Mind & Ultradian Focus Engine
 * Pure math, presets, wall-clock telemetry, audio synth, and stats aggregation
 */

export type FocusMode = "ultradian_90" | "sprint_50" | "pomodoro_25" | "custom";

export interface FocusModePreset {
  id: FocusMode;
  name: string;
  workMinutes: number;
  breakMinutes: number;
  description: string;
  badge: string;
}

export const FOCUS_PRESETS: Record<FocusMode, FocusModePreset> = {
  ultradian_90: {
    id: "ultradian_90",
    name: "Ultradian Rhythm",
    workMinutes: 90,
    breakMinutes: 20,
    description: "Natural basic rest-activity cycle (BRAC) for peak deep work",
    badge: "90 / 20",
  },
  sprint_50: {
    id: "sprint_50",
    name: "Deep Sprint",
    workMinutes: 50,
    breakMinutes: 10,
    description: "High-intensity sprint for analytical problems and engineering",
    badge: "50 / 10",
  },
  pomodoro_25: {
    id: "pomodoro_25",
    name: "Classic Pomodoro",
    workMinutes: 25,
    breakMinutes: 5,
    description: "Rapid iteration cycles for high-resistance or initial inertia",
    badge: "25 / 5",
  },
  custom: {
    id: "custom",
    name: "Custom Interval",
    workMinutes: 45,
    breakMinutes: 15,
    description: "Custom user-defined work and break intervals",
    badge: "Custom",
  },
};

export const PRESEEDED_TAGS = [
  "Coding / Engineering Deep Work",
  "Reading & Paper Study",
  "Writing & Documentation",
  "Creative Ideation / Design",
  "Phone / Social Media Distraction",
  "Mental Fatigue / Low Energy",
  "Flow State",
  "High Friction",
] as const;

export type CognitiveTag = typeof PRESEEDED_TAGS[number] | string;

export interface FocusSession {
  id: string;
  user_id?: string;
  task_name: string;
  mode: FocusMode;
  work_duration_minutes: number;
  break_duration_minutes: number;
  completed: boolean;
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
export function calculateRemainingSeconds(targetEndTimeMs: number): number {
  const now = Date.now();
  const diffMs = targetEndTimeMs - now;
  return Math.max(0, Math.ceil(diffMs / 1000));
}

/**
 * Formats seconds into MM:SS or H:MM:SS
 */
export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  const ss = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${ss}`;
}

/**
 * Calculates session progress (0.0 to 1.0)
 */
export function calculateSessionProgress(
  elapsedSeconds: number,
  totalSeconds: number
): number {
  if (totalSeconds <= 0) return 1.0;
  return Math.min(1.0, Math.max(0, elapsedSeconds / totalSeconds));
}

/**
 * Calculates daily focus stats and deep work score
 */
export function calculateDailyFocusStats(
  sessions: FocusSession[],
  dailyGoalMinutes: number = 180
): {
  totalMinutes: number;
  completedSessionsCount: number;
  completedUltradianCycles: number;
  averageRating: number | null;
  goalProgressPercent: number;
  deepWorkScore: number;
  tagCounts: Record<string, number>;
} {
  const activeSessions = sessions.filter((s) => !s.deleted_at);

  let totalMinutes = 0;
  let completedCount = 0;
  let ultradianCycles = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  const tagCounts: Record<string, number> = {};

  for (const s of activeSessions) {
    totalMinutes += s.work_duration_minutes;
    if (s.completed) {
      completedCount++;
      if (s.mode === "ultradian_90") {
        ultradianCycles++;
      }
    }
    if (s.rating && s.rating >= 1 && s.rating <= 5) {
      ratingSum += s.rating;
      ratingCount++;
    }
    for (const tag of s.friction_tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const averageRating =
    ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;

  const goalProgressPercent =
    dailyGoalMinutes > 0
      ? Math.min(100, Math.round((totalMinutes / dailyGoalMinutes) * 100))
      : 0;

  // Deep Work Score (0 - 100)
  // Duration: 50%
  // Quality / Rating: 30%
  // Completed cycles: 20%
  let durationPts = Math.min(50, (totalMinutes / (dailyGoalMinutes || 180)) * 50);
  let qualityPts = averageRating ? (averageRating / 5) * 30 : 15; // neutral 15 if unrated
  let cyclePts = Math.min(20, ultradianCycles * 10);

  const deepWorkScore =
    activeSessions.length > 0
      ? Math.round(durationPts + qualityPts + cyclePts)
      : 0;

  return {
    totalMinutes,
    completedSessionsCount: completedCount,
    completedUltradianCycles: ultradianCycles,
    averageRating,
    goalProgressPercent,
    deepWorkScore,
    tagCounts,
  };
}

/**
 * Web Audio API Harmonic Chime Synthesizer
 * Generates pure harmonic bell chords with zero external audio assets
 */
export function playHarmonicChime(
  type: "work_complete" | "break_complete" | "tick" = "work_complete"
): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "work_complete") {
      // Harmonic Triad Bell (C5, E5, G5, C6) - Rewarding, celebratory bell
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        // Exponential decay envelope
        gain.gain.setValueAtTime(0, now + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + index * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 1.85);
      });
    } else if (type === "break_complete") {
      // Gentle Awakening Bell (A4, E5, A5) - Calm transition back to focus
      const freqs = [440.0, 659.25, 880.0];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, now + index * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.1 + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 1.55);
      });
    } else if (type === "tick") {
      // Subtle cue
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    console.warn("Web Audio API chime could not play:", e);
  }
}
