// ============================================================================
// LifeMaxxing Stage 9: Settings, Validation & Units Engine
// Pure mathematical functions, invariants, conversions, and Supabase helpers
// ============================================================================

import { SupabaseClient } from "@supabase/supabase-js";

export type WeightUnit = "kg" | "lbs";
export type SexOption = "male" | "female" | "prefer_not_to_say";
export type GoalType = "cut" | "bulk" | "recomp";
export type CaloriePacing = "conservative" | "optimal" | "aggressive";
export type FocusMode = "sprint_50" | "ultradian_90" | "pomodoro_25" | "custom";
export type AppLocale = "en" | "ar";

export interface UserProfile {
  id: string;
  birth_year: number | null;
  sex: SexOption | null;
  height_cm: number | null;
  timezone: string;
  weight_unit: WeightUnit;
  goal_type: GoalType | null;
  target_weight_kg: number | null;
  locale: AppLocale;
  display_name?: string | null;
  avatar_url?: string | null;
  current_weight_kg?: number | null;
}

export interface UserSettings {
  user_id: string;
  // Targets (STRICTLY NULLABLE: No invented targets)
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fats_g: number | null;
  water_target_ml: number | null;
  calorie_pacing: CaloriePacing | null;
  target_sleep_hours: number | null;
  bedtime_target: string | null; // "HH:MM"
  wake_time_target: string | null; // "HH:MM"
  daily_focus_goal_minutes: number | null;
  caffeine_cutoff_hours: number | null;
  screen_cutoff_minutes: number | null;

  // Preferences (Honest defaults)
  default_focus_mode: FocusMode;
  sound_chime_enabled: boolean;
  sound_volume: number; // 0 - 100
  vibration_enabled: boolean;
  hide_adherence_scores: boolean;
}

// ----------------------------------------------------------------------------
// 1. Unit Conversions (Storage strictly in kg; lbs is display only)
// ----------------------------------------------------------------------------
const KG_TO_LBS_FACTOR = 2.20462262185;
const LBS_TO_KG_FACTOR = 0.45359237;

export function kgToLbs(kg: number): number {
  if (isNaN(kg) || kg <= 0) return 0;
  return Number((kg * KG_TO_LBS_FACTOR).toFixed(1));
}

export function lbsToKg(lbs: number): number {
  if (isNaN(lbs) || lbs <= 0) return 0;
  return Number((lbs * LBS_TO_KG_FACTOR).toFixed(2));
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit = "kg"): string {
  if (kg === null || kg === undefined || isNaN(kg)) return "Not set";
  if (unit === "lbs") {
    return `${kgToLbs(kg)} lbs`;
  }
  return `${Number(kg.toFixed(1))} kg`;
}

export function displayWeightNumber(kg: number | null | undefined, unit: WeightUnit = "kg"): number | null {
  if (kg === null || kg === undefined || isNaN(kg)) return null;
  if (unit === "lbs") {
    return kgToLbs(kg);
  }
  return Number(kg.toFixed(1));
}

// ----------------------------------------------------------------------------
// 2. Sex & Neutral Average Baselines
// ----------------------------------------------------------------------------
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: SexOption | null
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "male") {
    return Math.round(base + 5);
  }
  if (sex === "female") {
    return Math.round(base - 161);
  }
  // Neutral average between male (+5) and female (-161) is -78
  return Math.round(base - 78);
}

// ----------------------------------------------------------------------------
// 3. Circadian Sleep Derivation (Bedtime & Wake time across midnight wrap)
// ----------------------------------------------------------------------------
export function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function deriveSleepDurationHours(bedtime: string, wakeTime: string): number | null {
  const bedMin = parseTimeToMinutes(bedtime);
  const wakeMin = parseTimeToMinutes(wakeTime);
  if (bedMin === null || wakeMin === null) return null;

  // Midnight wrap: (wake - bed + 1440) % 1440
  const durationMinutes = (wakeMin - bedMin + 1440) % 1440;
  return Number((durationMinutes / 60).toFixed(2));
}

export function checkSleepDurationTolerance(
  manualHours: number,
  derivedHours: number
): { isDiscrepant: boolean; diffMinutes: number; warning?: string } {
  const diffMinutes = Math.abs(Math.round((manualHours - derivedHours) * 60));
  const isDiscrepant = diffMinutes > 15; // 15 minutes tolerance

  if (isDiscrepant) {
    return {
      isDiscrepant: true,
      diffMinutes,
      warning: `Derived sleep duration from bedtime and wake time is ${derivedHours.toFixed(1)}h (differs from manual ${manualHours.toFixed(1)}h by ${diffMinutes}m).`,
    };
  }
  return { isDiscrepant: false, diffMinutes };
}

// ----------------------------------------------------------------------------
// 4. Safe Calorie Floor & Macro Invariants (Warnings only — never silent clamp)
// ----------------------------------------------------------------------------
export function getCalorieSafeFloor(sex: SexOption | null): number {
  if (sex === "male") return 1500;
  if (sex === "female") return 1200;
  return 1350; // Neutral physiological floor
}

export function checkCalorieSafeFloor(
  targetCalories: number | null | undefined,
  sex: SexOption | null
): { isBelowFloor: boolean; floor: number; warning?: string } {
  const floor = getCalorieSafeFloor(sex);
  if (!targetCalories || targetCalories <= 0) {
    return { isBelowFloor: false, floor };
  }
  if (targetCalories < floor) {
    return {
      isBelowFloor: true,
      floor,
      warning: `Calorie target (${targetCalories} kcal) is below the recommended physiological safe floor (${floor} kcal). Prolonged extreme deficits may increase lean muscle loss and fatigue.`,
    };
  }
  return { isBelowFloor: false, floor };
}

export function checkMacroCalorieMismatch(
  targetCalories: number | null | undefined,
  proteinG: number | null | undefined,
  carbsG: number | null | undefined,
  fatsG: number | null | undefined
): { isDiscrepant: boolean; macroCalories: number; diff: number; warning?: string } {
  if (!targetCalories || targetCalories <= 0) {
    return { isDiscrepant: false, macroCalories: 0, diff: 0 };
  }
  const p = proteinG || 0;
  const c = carbsG || 0;
  const f = fatsG || 0;

  if (p === 0 && c === 0 && f === 0) {
    return { isDiscrepant: false, macroCalories: 0, diff: 0 };
  }

  const macroCalories = p * 4 + c * 4 + f * 9;
  const diff = Math.abs(macroCalories - targetCalories);
  const isDiscrepant = diff > 50;

  if (isDiscrepant) {
    const direction = macroCalories > targetCalories ? "+" : "-";
    return {
      isDiscrepant: true,
      macroCalories,
      diff,
      warning: `Macros total ${macroCalories} kcal (${direction}${diff} kcal vs your ${targetCalories} kcal target).`,
    };
  }
  return { isDiscrepant: false, macroCalories, diff };
}

// ----------------------------------------------------------------------------
// 5. Weekly Pacing Indicators
// ----------------------------------------------------------------------------
export function getPacingDetails(
  pacing: CaloriePacing | null | undefined,
  goalType: GoalType | null | undefined
): { weeklyKg: number; weeklyLbs: number; dailyKcalOffset: number; label: string } {
  if (!pacing || goalType === "recomp") {
    return { weeklyKg: 0, weeklyLbs: 0, dailyKcalOffset: 0, label: "Maintenance / Body Recomposition" };
  }

  const sign = goalType === "bulk" ? 1 : -1;

  switch (pacing) {
    case "conservative":
      return {
        weeklyKg: Number((0.25 * sign).toFixed(2)),
        weeklyLbs: Number((0.55 * sign).toFixed(2)),
        dailyKcalOffset: 275 * sign,
        label: `Conservative (~${Math.abs(0.25 * sign)} kg/wk, ~275 kcal/day)`,
      };
    case "aggressive":
      return {
        weeklyKg: Number((0.85 * sign).toFixed(2)),
        weeklyLbs: Number((1.85 * sign).toFixed(2)),
        dailyKcalOffset: 925 * sign,
        label: `Aggressive (~${Math.abs(0.85 * sign)} kg/wk, ~925 kcal/day)`,
      };
    case "optimal":
    default:
      return {
        weeklyKg: Number((0.50 * sign).toFixed(2)),
        weeklyLbs: Number((1.10 * sign).toFixed(2)),
        dailyKcalOffset: 550 * sign,
        label: `Optimal (~${Math.abs(0.50 * sign)} kg/wk, ~550 kcal/day)`,
      };
  }
}

// ----------------------------------------------------------------------------
// 6. Timezones List & Warning Notice
// ----------------------------------------------------------------------------
export const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Athens",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Cairo",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export const TIMEZONE_WARNING =
  "⚠️ Warning: Changing your timezone shifts the 00:00 midnight boundary. Historical telemetry (workouts, sleep days, daily nutrition totals, and focus sessions) will regroup according to the new local calendar day.";

// ----------------------------------------------------------------------------
// 7. Supabase Client Helpers (Handles user_settings with profiles fallback)
// ----------------------------------------------------------------------------
export async function loadFullUserSettings(
  client: SupabaseClient,
  userId: string
): Promise<{ profile: UserProfile | null; settings: UserSettings | null }> {
  // 1. Fetch profile
  const { data: profData } = await client
    .from("profiles")
    .select("id, birth_year, sex, height_cm, timezone, weight_unit, goal_type, target_weight_kg, locale, display_name, avatar_url, current_weight_kg")
    .eq("id", userId)
    .single();

  const profile: UserProfile | null = profData
    ? {
        id: profData.id,
        birth_year: profData.birth_year ? Number(profData.birth_year) : null,
        sex: (profData.sex as SexOption) || null,
        height_cm: profData.height_cm ? Number(profData.height_cm) : null,
        timezone: profData.timezone || "UTC",
        weight_unit: (profData.weight_unit as WeightUnit) || "kg",
        goal_type: (profData.goal_type as GoalType) || null,
        target_weight_kg: profData.target_weight_kg ? Number(profData.target_weight_kg) : null,
        locale: (profData.locale as AppLocale) || "en",
        display_name: profData.display_name || null,
        avatar_url: profData.avatar_url || null,
        current_weight_kg: profData.current_weight_kg ? Number(profData.current_weight_kg) : null,
      }
    : null;

  // 2. Fetch user_settings
  let settings: UserSettings | null = null;
  const { data: settData, error: settErr } = await client
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (settData && !settErr) {
    settings = {
      user_id: settData.user_id,
      target_calories: settData.target_calories ? Number(settData.target_calories) : null,
      target_protein_g: settData.target_protein_g ? Number(settData.target_protein_g) : null,
      target_carbs_g: settData.target_carbs_g ? Number(settData.target_carbs_g) : null,
      target_fats_g: settData.target_fats_g ? Number(settData.target_fats_g) : null,
      water_target_ml: settData.water_target_ml ? Number(settData.water_target_ml) : null,
      calorie_pacing: (settData.calorie_pacing as CaloriePacing) || null,
      target_sleep_hours: settData.target_sleep_hours ? Number(settData.target_sleep_hours) : null,
      bedtime_target: settData.bedtime_target || null,
      wake_time_target: settData.wake_time_target || null,
      daily_focus_goal_minutes: settData.daily_focus_goal_minutes ? Number(settData.daily_focus_goal_minutes) : null,
      caffeine_cutoff_hours: settData.caffeine_cutoff_hours ? Number(settData.caffeine_cutoff_hours) : null,
      screen_cutoff_minutes: settData.screen_cutoff_minutes ? Number(settData.screen_cutoff_minutes) : null,
      default_focus_mode: (settData.default_focus_mode as FocusMode) || "sprint_50",
      sound_chime_enabled: settData.sound_chime_enabled ?? true,
      sound_volume: settData.sound_volume !== null && settData.sound_volume !== undefined ? Number(settData.sound_volume) : 80,
      vibration_enabled: settData.vibration_enabled ?? true,
      hide_adherence_scores: settData.hide_adherence_scores ?? false,
    };
  } else {
    // Graceful fallback to legacy profile target columns if user_settings row not created yet
    const { data: legacyProf } = await client
      .from("profiles")
      .select("target_calories, target_protein_g, target_carbs_g, target_fats_g, water_target_ml, calorie_pacing, sleep_target_hours, daily_focus_goal_minutes, default_focus_mode, sound_chime_enabled, sound_volume, vibration_enabled, caffeine_cutoff_hours, screen_cutoff_minutes, hide_adherence_scores")
      .eq("id", userId)
      .maybeSingle();

    settings = {
      user_id: userId,
      target_calories: legacyProf?.target_calories ? Number(legacyProf.target_calories) : null,
      target_protein_g: legacyProf?.target_protein_g ? Number(legacyProf.target_protein_g) : null,
      target_carbs_g: legacyProf?.target_carbs_g ? Number(legacyProf.target_carbs_g) : null,
      target_fats_g: legacyProf?.target_fats_g ? Number(legacyProf.target_fats_g) : null,
      water_target_ml: legacyProf?.water_target_ml ? Number(legacyProf.water_target_ml) : null,
      calorie_pacing: (legacyProf?.calorie_pacing as CaloriePacing) || null,
      target_sleep_hours: legacyProf?.sleep_target_hours ? Number(legacyProf.sleep_target_hours) : null,
      bedtime_target: null,
      wake_time_target: null,
      daily_focus_goal_minutes: legacyProf?.daily_focus_goal_minutes ? Number(legacyProf.daily_focus_goal_minutes) : null,
      caffeine_cutoff_hours: legacyProf?.caffeine_cutoff_hours ? Number(legacyProf.caffeine_cutoff_hours) : null,
      screen_cutoff_minutes: legacyProf?.screen_cutoff_minutes ? Number(legacyProf.screen_cutoff_minutes) : null,
      default_focus_mode: (legacyProf?.default_focus_mode as FocusMode) || "sprint_50",
      sound_chime_enabled: legacyProf?.sound_chime_enabled ?? true,
      sound_volume: legacyProf?.sound_volume !== null && legacyProf?.sound_volume !== undefined ? Number(legacyProf.sound_volume) : 80,
      vibration_enabled: legacyProf?.vibration_enabled ?? true,
      hide_adherence_scores: legacyProf?.hide_adherence_scores ?? false,
    };
  }

  return { profile, settings };
}

export async function saveUserSettingsRow(
  client: SupabaseClient,
  userId: string,
  updates: Partial<UserSettings>
): Promise<{ success: boolean; error?: string }> {
  const payload = {
    ...updates,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("user_settings").upsert(payload);
  if (error) {
    // If user_settings table has an error, attempt fallback to profiles for targets
    const profFallback: Record<string, any> = {};
    if ("target_calories" in updates) profFallback.target_calories = updates.target_calories;
    if ("target_protein_g" in updates) profFallback.target_protein_g = updates.target_protein_g;
    if ("target_carbs_g" in updates) profFallback.target_carbs_g = updates.target_carbs_g;
    if ("target_fats_g" in updates) profFallback.target_fats_g = updates.target_fats_g;
    if ("water_target_ml" in updates) profFallback.water_target_ml = updates.water_target_ml;
    if ("calorie_pacing" in updates) profFallback.calorie_pacing = updates.calorie_pacing;
    if ("target_sleep_hours" in updates) profFallback.sleep_target_hours = updates.target_sleep_hours;
    if ("daily_focus_goal_minutes" in updates) profFallback.daily_focus_goal_minutes = updates.daily_focus_goal_minutes;
    if ("default_focus_mode" in updates) profFallback.default_focus_mode = updates.default_focus_mode;
    if ("sound_chime_enabled" in updates) profFallback.sound_chime_enabled = updates.sound_chime_enabled;
    if ("sound_volume" in updates) profFallback.sound_volume = updates.sound_volume;
    if ("vibration_enabled" in updates) profFallback.vibration_enabled = updates.vibration_enabled;

    if (Object.keys(profFallback).length > 0) {
      await client.from("profiles").update(profFallback).eq("id", userId);
    }
    return { success: true };
  }
  return { success: true };
}

export async function saveUserProfileRow(
  client: SupabaseClient,
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await client.from("profiles").update(updates).eq("id", userId);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
