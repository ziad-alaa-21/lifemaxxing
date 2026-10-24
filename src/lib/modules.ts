/**
 * Stage 2: User Module Toggles & First-Time Onboarding
 * Deterministic types, module metadata, starter pack,
 * idempotent upsert on first sign-in, and Egyptian colloquial Arabic register.
 *
 * Aligned with Migration 017:
 * The 11 modular toggles across Body, Mind, and School:
 * - module_workouts (Body: Workouts & Strength)
 * - module_nutrition (Body: Nutrition & Fuel)
 * - module_sleep (Body: Sleep & Circadian)
 * - module_weight (Body: Weight Tracking)
 * - module_focus (Mind: Focus Timer)
 * - module_math (Mind: Mental Math Arena)
 * - module_checkins (Mind: Mood & Energy Check-in)
 * - module_discipline (Mind: Discipline Commitments)
 * - module_reading (Mind: Reading & Book Log)
 * - module_screentime (Mind: Screen Time Telemetry)
 * - module_school (School: Academic Dashboard & Timetable)
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type ModuleKey =
  | "module_workouts"
  | "module_nutrition"
  | "module_sleep"
  | "module_weight"
  | "module_focus"
  | "module_math"
  | "module_checkins"
  | "module_discipline"
  | "module_reading"
  | "module_screentime"
  | "module_school";

export interface UserModulesRecord {
  user_id: string;
  has_completed_onboarding: boolean;
  module_workouts: boolean | null;
  module_nutrition: boolean | null;
  module_sleep: boolean | null;
  module_weight: boolean | null;
  module_focus: boolean | null;
  module_math: boolean | null;
  module_checkins: boolean | null;
  module_discipline: boolean | null;
  module_reading: boolean | null;
  module_screentime: boolean | null;
  module_school: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface ModuleDefinition {
  key: ModuleKey;
  pillar: "body" | "mind" | "school";
  labelEn: string;
  labelAr: string; // Egyptian colloquial register
  descriptionEn: string;
  descriptionAr: string; // Egyptian colloquial register
  icon: string;
}

export const ALL_MODULE_KEYS: ModuleKey[] = [
  "module_workouts",
  "module_nutrition",
  "module_sleep",
  "module_weight",
  "module_focus",
  "module_math",
  "module_checkins",
  "module_discipline",
  "module_reading",
  "module_screentime",
  "module_school",
];

export const STARTER_PACK_MODULES: ModuleKey[] = [
  "module_workouts",
  "module_nutrition",
  "module_focus",
];

export const MODULE_DEFINITIONS: Record<ModuleKey, ModuleDefinition> = {
  module_workouts: {
    key: "module_workouts",
    pillar: "body",
    labelEn: "Workouts & Strength",
    labelAr: "التمارين والحديد",
    descriptionEn: "Log sets, reps, progressive overload, and RPE.",
    descriptionAr: "سجل مجاميعك وأوزانك وزيادة الحمل التدريبي خطوة بخطوة.",
    icon: "Dumbbell",
  },
  module_nutrition: {
    key: "module_nutrition",
    pillar: "body",
    labelEn: "Nutrition & Fuel",
    labelAr: "الأكل والتغذية",
    descriptionEn: "Calories, macros, water, and meal logging.",
    descriptionAr: "حساب السعرات والماكروز والبروتين ومتابعة وجباتك.",
    icon: "Utensils",
  },
  module_sleep: {
    key: "module_sleep",
    pillar: "body",
    labelEn: "Sleep & Circadian",
    labelAr: "النوم والراحة",
    descriptionEn: "Bedtime consistency, sleep debt, and recovery.",
    descriptionAr: "ظبط ميعاد نومك وساعات راحتك وجودة استشفائك.",
    icon: "Moon",
  },
  module_weight: {
    key: "module_weight",
    pillar: "body",
    labelEn: "Weight Tracking",
    labelAr: "متابعة الوزن",
    descriptionEn: "Morning weigh-ins, moving average, and body trend.",
    descriptionAr: "سجل وزنك كل يوم وشوف اتجاه التغيير بدون وسوسة.",
    icon: "Scale",
  },
  module_focus: {
    key: "module_focus",
    pillar: "mind",
    labelEn: "Focus Timer",
    labelAr: "مؤقت التركيز",
    descriptionEn: "Deep work sessions with custom work and rest intervals.",
    descriptionAr: "جلسات تركيز بدون تشتيت مع فترات راحة مظبوطة.",
    icon: "Timer",
  },
  module_math: {
    key: "module_math",
    pillar: "mind",
    labelEn: "Mental Math Arena",
    labelAr: "تدريب الحساب الذهني",
    descriptionEn: "Sprint and precision mental arithmetic training.",
    descriptionAr: "تمارين سرعة ودقة للحساب الذهني لتنشيط العقل.",
    icon: "Zap",
  },
  module_checkins: {
    key: "module_checkins",
    pillar: "mind",
    labelEn: "Mood & Energy Check-in",
    labelAr: "تسجيل المزاج والطاقة",
    descriptionEn: "Calibrate daily mood, energy, and cognitive focus.",
    descriptionAr: "سجل حالتك الذهنية وطاقتك اليومية بصدق وسرعة.",
    icon: "Activity",
  },
  module_discipline: {
    key: "module_discipline",
    pillar: "mind",
    labelEn: "Discipline & Daily Habits",
    labelAr: "الالتزام والعادات اليومية",
    descriptionEn: "Daily non-negotiable habits and commitments.",
    descriptionAr: "عاداتك الأساسية اللي مفيهاش فصال يومياً.",
    icon: "CheckCircle2",
  },
  module_reading: {
    key: "module_reading",
    pillar: "mind",
    labelEn: "Reading & Book Log",
    labelAr: "القراءة والكتب",
    descriptionEn: "Track daily pages read, current books, and reading pace.",
    descriptionAr: "تابع الصفحات اللي قريتها والكتب اللي شغال فيها دلوقتي.",
    icon: "BookOpen",
  },
  module_screentime: {
    key: "module_screentime",
    pillar: "mind",
    labelEn: "Screen Time Control",
    labelAr: "وقت الشاشات والموبايل",
    descriptionEn: "Log daily screen minutes and monitor pre-bed digital cutoffs.",
    descriptionAr: "سجل استخدامك للشاشة وحافظ على وقت هدوء قبل النوم.",
    icon: "Smartphone",
  },
  module_school: {
    key: "module_school",
    pillar: "school",
    labelEn: "School & Academic Hub",
    labelAr: "الدراسة والمذاكرة",
    descriptionEn: "Class schedule, exams, study targets, and subject revision.",
    descriptionAr: "جدول الحصص والامتحانات والمراجعات ومتابعة المذاكرة.",
    icon: "GraduationCap",
  },
};

/**
 * Idempotent Upsert on First Sign-in:
 * Single, tested mechanism to ensure user_modules row exists for the user.
 * Runs under authenticated RLS session (auth.uid() = user_id).
 */
export async function ensureUserModules(
  supabase: SupabaseClient,
  userId: string
): Promise<UserModulesRecord> {
  // 1. Try reading existing record
  const { data: existing, error: readErr } = await supabase
    .from("user_modules")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return existing as UserModulesRecord;
  }

  // 2. If table does not exist yet (schema pending)
  if (readErr && (readErr.code === "PGRST205" || readErr.message?.includes("does not exist"))) {
    // Return all-true default representation in memory
    return {
      user_id: userId,
      has_completed_onboarding: true,
      module_workouts: true,
      module_nutrition: true,
      module_sleep: true,
      module_weight: true,
      module_focus: true,
      module_math: true,
      module_checkins: true,
      module_discipline: true,
      module_reading: true,
      module_screentime: true,
      module_school: true,
    };
  }

  // 3. Insert new row with has_completed_onboarding = false, modules NULL
  const { data: inserted, error: insErr } = await supabase
    .from("user_modules")
    .insert({
      user_id: userId,
      has_completed_onboarding: false,
    })
    .select()
    .single();

  if (inserted) {
    return inserted as UserModulesRecord;
  }

  // In case of conflict (race condition), read again
  const { data: recheck } = await supabase
    .from("user_modules")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (recheck) {
    return recheck as UserModulesRecord;
  }

  // Fallback safe object
  return {
    user_id: userId,
    has_completed_onboarding: false,
    module_workouts: null,
    module_nutrition: null,
    module_sleep: null,
    module_weight: null,
    module_focus: null,
    module_math: null,
    module_checkins: null,
    module_discipline: null,
    module_reading: null,
    module_screentime: null,
    module_school: null,
  };
}

/**
 * Complete Onboarding:
 * Explicitly sets all 7 columns to true or false (no NULLs)
 * and sets has_completed_onboarding = true.
 * Enforces the at-least-one-true constraint before sending.
 */
export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string,
  selectedKeys: ModuleKey[]
): Promise<{ success: boolean; error?: string; record?: UserModulesRecord }> {
  if (selectedKeys.length === 0) {
    return {
      success: false,
      error: "Please select at least one module to continue.",
    };
  }

  const payload: Record<string, boolean | string> = {
    user_id: userId,
    has_completed_onboarding: true,
    updated_at: new Date().toISOString(),
  };

  for (const key of ALL_MODULE_KEYS) {
    payload[key] = selectedKeys.includes(key);
  }

  const { data, error } = await supabase
    .from("user_modules")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, record: data as UserModulesRecord };
}

/**
 * Update a single module or subset of modules in Settings > Modules.
 * Enforces at-least-one-true invariant.
 */
export async function updateModuleSettings(
  supabase: SupabaseClient,
  userId: string,
  currentRecord: UserModulesRecord,
  targetKey: ModuleKey,
  targetValue: boolean
): Promise<{ success: boolean; error?: string; record?: UserModulesRecord }> {
  // If user is trying to turn off a module, check if it's the last remaining one
  if (!targetValue) {
    const remainingCount = ALL_MODULE_KEYS.filter((k) =>
      k === targetKey ? false : currentRecord[k] === true
    ).length;

    if (remainingCount === 0) {
      return {
        success: false,
        error: "At least one module must remain enabled.",
      };
    }
  }

  const { data, error } = await supabase
    .from("user_modules")
    .update({
      [targetKey]: targetValue,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, record: data as UserModulesRecord };
}

/**
 * Checks if a specific module is active.
 * Invariant: A missing row, failed upsert, or incomplete onboarding NEVER means "show everything".
 * It returns false, gating the interface until explicit onboarding is completed or recovered.
 */
export function isModuleActive(
  modules: UserModulesRecord | null,
  key: ModuleKey
): boolean {
  if (!modules) return false;
  if (!modules.has_completed_onboarding) return false;
  return modules[key] === true;
}

/**
 * Checks if an entire pillar has any active modules.
 * Invariant: Returns false if modules is null or onboarding is incomplete.
 */
export function isPillarActive(
  modules: UserModulesRecord | null,
  pillar: "body" | "mind" | "school"
): boolean {
  if (!modules) return false;
  if (!modules.has_completed_onboarding) return false;

  switch (pillar) {
    case "body":
      return (
        modules.module_workouts === true ||
        modules.module_nutrition === true ||
        modules.module_sleep === true ||
        modules.module_weight === true
      );
    case "mind":
      return (
        modules.module_focus === true ||
        modules.module_math === true ||
        modules.module_checkins === true ||
        modules.module_discipline === true ||
        modules.module_reading === true ||
        modules.module_screentime === true
      );
    case "school":
      return modules.module_school === true;
    default:
      return false;
  }
}
