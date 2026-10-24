import { SupabaseClient, User } from "@supabase/supabase-js";

export interface ProvisioningResult {
  modulesCreated: boolean;
  profileCreated: boolean;
  settingsCreated: boolean;
  errors: string[];
}

/**
 * Idempotently provision first-login records for a user:
 * 1. user_modules (has_completed_onboarding = false, all modules NULL)
 * 2. profiles (id, display_name from metadata or email, avatar_url, no invented defaults)
 * 3. user_settings (default preferences, targets left NULL)
 *
 * If rows already exist (returning user), they are NEVER overwritten.
 */
export async function provisionFirstLogin(
  supabase: SupabaseClient,
  user: User
): Promise<ProvisioningResult> {
  const result: ProvisioningResult = {
    modulesCreated: false,
    profileCreated: false,
    settingsCreated: false,
    errors: [],
  };

  const userId = user.id;

  // 1. user_modules
  try {
    const { data: existingModules, error: modFetchErr } = await supabase
      .from("user_modules")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingModules && !modFetchErr) {
      const { error: modInsErr } = await supabase.from("user_modules").insert({
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
      });
      if (modInsErr) {
        result.errors.push(`user_modules insert: ${modInsErr.message}`);
      } else {
        result.modulesCreated = true;
      }
    }
  } catch (err: unknown) {
    result.errors.push(`user_modules error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. profiles
  try {
    const { data: existingProfile, error: profFetchErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile && !profFetchErr) {
      const meta = user.user_metadata || {};
      const displayName =
        (typeof meta.full_name === "string" && meta.full_name.trim()) ||
        (typeof meta.name === "string" && meta.name.trim()) ||
        (user.email ? user.email.split("@")[0] : null);
      const avatarUrl =
        (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
        (typeof meta.picture === "string" && meta.picture.trim()) ||
        null;

      const { error: profInsErr } = await supabase.from("profiles").insert({
        id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
      });
      if (profInsErr) {
        result.errors.push(`profiles insert: ${profInsErr.message}`);
      } else {
        result.profileCreated = true;
      }
    }
  } catch (err: unknown) {
    result.errors.push(`profiles error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. user_settings
  try {
    const { data: existingSettings, error: settFetchErr } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingSettings && !settFetchErr) {
      const { error: settInsErr } = await supabase.from("user_settings").insert({
        user_id: userId,
        default_focus_mode: "sprint_50",
        sound_chime_enabled: true,
        sound_volume: 80,
        vibration_enabled: true,
        hide_adherence_scores: false,
        // targets strictly NULL
      });
      if (settInsErr) {
        result.errors.push(`user_settings insert: ${settInsErr.message}`);
      } else {
        result.settingsCreated = true;
      }
    }
  } catch (err: unknown) {
    result.errors.push(`user_settings error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}
