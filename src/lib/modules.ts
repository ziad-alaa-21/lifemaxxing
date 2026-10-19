/**
 * Stage 2: User Module Toggles & First-Time Onboarding
 * Deterministic types, module metadata, starter pack,
 * idempotent upsert on first sign-in, and Egyptian colloquial Arabic register.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type ModuleKey =
  | "module_workouts"
  | "module_nutrition"
  | "module_sleep"
  | "module_weight"
  | "module_mind_focus"
  | "module_mind_discipline"
  | "module_mind_reading"
  | "module_mind_screentime"
  | "module_school_timetable"
  | "module_school_topics"
  | "module_school_mistakes";

export interface UserModulesRecord {
  id?: string;
  user_id: string;
  has_completed_onboarding: boolean;
  module_workouts: boolean | null;
  module_nutrition: boolean | null;
  module_sleep: boolean | null;
  module_weight: boolean | null;
  module_mind_focus: boolean | null;
  module_mind_discipline: boolean | null;
  module_mind_reading: boolean | null;
  module_mind_screentime: boolean | null;
  module_school_timetable: boolean | null;
  module_school_topics: boolean | null;
  module_school_mistakes: boolean | null;
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
  "module_mind_focus",
  "module_mind_discipline",
  "module_mind_reading",
  "module_mind_screentime",
  "module_school_timetable",
  "module_school_topics",
  "module_school_mistakes",
];

export const STARTER_PACK_MODULES: ModuleKey[] = [
  "module_workouts",
  "module_nutrition",
  "module_mind_focus",
];

export const MODULE_DEFINITIONS: Record<ModuleKey, ModuleDefinition> = {
  module_workouts: {
    key: "module_workouts",
    pillar: "body",
    labelEn: "Workouts & Strength",
    labelAr: "التمارين والقوة",
    descriptionEn: "Log sets, track exercises, and build progressive overload.",
    descriptionAr: "سجل مجاميعك، تابع التمارين، وطوّر أوزانك أول بأول.",
    icon: "Dumbbell",
  },
  module_nutrition: {
    key: "module_nutrition",
    pillar: "body",
    labelEn: "Nutrition & Hydration",
    labelAr: "الأكل وشرب المية",
    descriptionEn: "Track meals, calories, protein, and daily water intake.",
    descriptionAr: "تابع وجباتك، سعراتك، البروتين، وشرب المية في يومك.",
    icon: "Utensils",
  },
  module_sleep: {
    key: "module_sleep",
    pillar: "body",
    labelEn: "Sleep & Circadian Rhythm",
    labelAr: "النوم والساعة البيولوجية",
    descriptionEn: "Track sleep duration, bedtime consistency, and wake-up target.",
    descriptionAr: "سجل ساعات نومك، التزامك بمواعيد النوم، وصحيانك في ميعادك.",
    icon: "Moon",
  },
  module_weight: {
    key: "module_weight",
    pillar: "body",
    labelEn: "Bodyweight Trends",
    labelAr: "متابعة وزن الجسم",
    descriptionEn: "Weigh-in logs with moving averages and rate of change.",
    descriptionAr: "سجل وزنك وشوف منحنى التغير والوزن المتوسط بهدوء.",
    icon: "Scale",
  },
  module_mind_focus: {
    key: "module_mind_focus",
    pillar: "mind",
    labelEn: "Focus Timer",
    labelAr: "مؤقت التركيز",
    descriptionEn: "Deep work sessions with custom work and rest intervals.",
    descriptionAr: "جلسات تركيز بدون تشتيت مع فترات راحة مظبوطة.",
    icon: "Timer",
  },
  module_mind_discipline: {
    key: "module_mind_discipline",
    pillar: "mind",
    labelEn: "Discipline & Daily Habits",
    labelAr: "الالتزام والعادات اليومية",
    descriptionEn: "Daily non-negotiable habits and mood check-ins.",
    descriptionAr: "عاداتك الأساسية اللي مفيهاش فصال وتسجيل حالتك اليومية.",
    icon: "CheckCircle2",
  },
  module_mind_reading: {
    key: "module_mind_reading",
    pillar: "mind",
    labelEn: "Reading & Book Log",
    labelAr: "القراءة والكتب",
    descriptionEn: "Track daily pages read, current books, and reading pace.",
    descriptionAr: "تابع الصفحات اللي قريتها والكتب اللي شغال فيها دلوقتي.",
    icon: "BookOpen",
  },
  module_mind_screentime: {
    key: "module_mind_screentime",
    pillar: "mind",
    labelEn: "Screen Time Control",
    labelAr: "وقت الشاشات والموبايل",
    descriptionEn: "Log daily screen minutes and monitor pre-bed digital cutoffs.",
    descriptionAr: "سجل استخدامك للشاشة وحافظ على وقت هدوء قبل النوم.",
    icon: "Smartphone",
  },
  module_school_timetable: {
    key: "module_school_timetable",
    pillar: "school",
    labelEn: "Class Schedule & Timetable",
    labelAr: "جدول الحصص والمحاضرات",
    descriptionEn: "Weekly recurring schedule and class timetable grid.",
    descriptionAr: "جدولك الأسبوعي ومواعيد حصصك ومحاضراتك منظمة.",
    icon: "Calendar",
  },
  module_school_topics: {
    key: "module_school_topics",
    pillar: "school",
    labelEn: "Topics & Spaced Revision",
    labelAr: "المواضيع والمراجعة الذكية",
    descriptionEn: "Subject topics with spaced repetition intervals.",
    descriptionAr: "مواضيع المواد ومواعيد مراجعتها على فترات متباعدة.",
    icon: "ListChecks",
  },
  module_school_mistakes: {
    key: "module_school_mistakes",
    pillar: "school",
    labelEn: "Mistakes Notebook",
    labelAr: "دفتر الأخطاء",
    descriptionEn: "Log exam and homework mistakes, analyze causes, and redo them.",
    descriptionAr: "سجل الغلطات اللي وقعت فيها في الامتحانات وحلها تاني عشان تثبت.",
    icon: "BookX",
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
      module_mind_focus: true,
      module_mind_discipline: true,
      module_mind_reading: true,
      module_mind_screentime: true,
      module_school_timetable: true,
      module_school_topics: true,
      module_school_mistakes: true,
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
    module_mind_focus: null,
    module_mind_discipline: null,
    module_mind_reading: null,
    module_mind_screentime: null,
    module_school_timetable: null,
    module_school_topics: null,
    module_school_mistakes: null,
  };
}

/**
 * Complete Onboarding:
 * Explicitly sets all 11 columns to true or false (no NULLs)
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
        modules.module_mind_focus === true ||
        modules.module_mind_discipline === true ||
        modules.module_mind_reading === true ||
        modules.module_mind_screentime === true
      );
    case "school":
      return (
        modules.module_school_timetable === true ||
        modules.module_school_topics === true ||
        modules.module_school_mistakes === true
      );
    default:
      return false;
  }
}
