/**
 * Mind Check-in Engine (Stage 7b)
 * Plain rating labels, non-duplicated external context tags, auto-detected biological state, and zero diagnosis
 */

export type CheckinPeriod = "morning" | "midday" | "evening";

export interface MindCheckin {
  id?: string;
  user_id?: string;
  logged_date: string;
  period: CheckinPeriod;
  mood_score: number; // 1 - 5
  energy_score: number; // 1 - 5
  focus_score: number; // 1 - 5
  context_tags: string[];
  notes?: string | null;
  auto_context?: {
    sleepHours?: number | null;
    caffeineMg?: number | null;
    waterMl?: number | null;
  };
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Plain labels for mood, energy, and focus ratings
 * (Top rating = "Very good", no clinical jargon)
 */
export const RATING_LABELS: Record<number, string> = {
  5: "Very good",
  4: "Good",
  3: "Neutral",
  2: "Low",
  1: "Very low",
};

/**
 * Context tags strictly for external/situational factors the app cannot know automatically.
 * Does NOT duplicate sleep, caffeine, or fasting.
 */
export const EXTERNAL_CONTEXT_TAGS = [
  "Work stress",
  "Exam / deadline pressure",
  "Interpersonal conflict",
  "Calm environment",
  "Noisy / chaotic space",
  "Travel or in transit",
  "Outdoors / fresh air",
  "Physical soreness",
  "Mild headache",
  "Post-workout endorphins",
] as const;

export type ExternalContextTag = (typeof EXTERNAL_CONTEXT_TAGS)[number] | string;

export const PRIVACY_DISCLAIMER =
  "Your check-ins are strictly private to your device and account. Life does not provide medical diagnoses or external clinical advice.";

/**
 * Helper to get the period based on current hour in user's local time
 */
export function getDefaultCheckinPeriod(hour: number): CheckinPeriod {
  if (hour < 12) return "morning";
  if (hour < 17) return "midday";
  return "evening";
}

/**
 * Format plain rating summary string
 */
export function formatCheckinSummary(checkin: MindCheckin): string {
  const mood = RATING_LABELS[checkin.mood_score] || `${checkin.mood_score}/5`;
  const energy = RATING_LABELS[checkin.energy_score] || `${checkin.energy_score}/5`;
  const focus = RATING_LABELS[checkin.focus_score] || `${checkin.focus_score}/5`;
  return `Mood: ${mood} • Energy: ${energy} • Focus: ${focus}`;
}
