-- ============================================================================
-- Migration: 010_user_settings_and_preferences.sql
-- Stage 9: Settings, User Targets, Protocol Customization & Data Sovereignty
--
-- 1. Drops legacy key-value user_settings table safely (0 active rows verified)
-- 2. Creates dedicated relational public.user_settings table (user_id PK)
-- 3. Targets are STRICTLY NULLABLE with zero invented defaults
-- 4. Preferences have honest defaults
-- 5. Enables strict Row-Level Security on user_settings (auth.uid() = user_id)
-- 6. Updates public.profiles: weight_unit ('kg'|'lbs'), sex constraint update
-- 7. Migrates existing target columns from profiles to user_settings
-- 8. Defines SECURITY DEFINER functions for hard data wipe and account deletion
-- ============================================================================

-- Step 1: Drop legacy empty key-value table
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- Step 2: Create dedicated relational user_settings table
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Targets (ALL DEFAULT NULL: NO INVENTED TARGETS)
  target_calories integer DEFAULT NULL,
  target_protein_g integer DEFAULT NULL,
  target_carbs_g integer DEFAULT NULL,
  target_fats_g integer DEFAULT NULL,
  water_target_ml integer DEFAULT NULL,
  calorie_pacing text DEFAULT NULL CHECK (calorie_pacing IS NULL OR calorie_pacing IN ('conservative', 'optimal', 'aggressive')),
  target_sleep_hours numeric DEFAULT NULL CHECK (target_sleep_hours IS NULL OR (target_sleep_hours >= 3.0 AND target_sleep_hours <= 16.0)),
  bedtime_target time DEFAULT NULL,
  wake_time_target time DEFAULT NULL,
  daily_focus_goal_minutes integer DEFAULT NULL CHECK (daily_focus_goal_minutes IS NULL OR daily_focus_goal_minutes >= 0),
  caffeine_cutoff_hours numeric DEFAULT NULL,
  screen_cutoff_minutes numeric DEFAULT NULL,

  -- Preferences (Honest defaults permitted)
  default_focus_mode text NOT NULL DEFAULT 'sprint_50' CHECK (default_focus_mode IN ('sprint_50', 'ultradian_90', 'pomodoro_25', 'custom')),
  sound_chime_enabled boolean NOT NULL DEFAULT true,
  sound_volume integer NOT NULL DEFAULT 80 CHECK (sound_volume >= 0 AND sound_volume <= 100),
  vibration_enabled boolean NOT NULL DEFAULT true,
  hide_adherence_scores boolean NOT NULL DEFAULT false,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Enable strict Row-Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Ensure profiles has required biometric columns and updated constraints
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ar'));

-- Update sex check constraint to allow 'prefer_not_to_say' and NULL
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sex_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sex_check CHECK (sex IS NULL OR sex IN ('male', 'female', 'prefer_not_to_say'));

-- Step 5: Migrate any existing target values from profiles into user_settings
INSERT INTO public.user_settings (
  user_id,
  target_calories,
  target_protein_g,
  target_carbs_g,
  target_fats_g,
  water_target_ml,
  calorie_pacing,
  target_sleep_hours,
  daily_focus_goal_minutes,
  default_focus_mode,
  sound_chime_enabled,
  sound_volume,
  vibration_enabled,
  caffeine_cutoff_hours,
  screen_cutoff_minutes,
  hide_adherence_scores
)
SELECT
  p.id AS user_id,
  p.target_calories,
  p.target_protein_g,
  p.target_carbs_g,
  p.target_fats_g,
  p.water_target_ml,
  p.calorie_pacing,
  p.sleep_target_hours AS target_sleep_hours,
  p.daily_focus_goal_minutes,
  COALESCE(p.default_focus_mode, 'sprint_50'),
  COALESCE(p.sound_chime_enabled, true),
  COALESCE(p.sound_volume, 80),
  COALESCE(p.vibration_enabled, true),
  p.caffeine_cutoff_hours,
  p.screen_cutoff_minutes,
  COALESCE(p.hide_adherence_scores, false)
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: PostgreSQL RPC function: Hard delete telemetry data while keeping account
CREATE OR REPLACE FUNCTION public.delete_own_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  IF current_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all user telemetry rows
  DELETE FROM public.weight_logs WHERE user_id = current_uid;
  DELETE FROM public.sleep_logs WHERE user_id = current_uid;
  DELETE FROM public.meal_logs WHERE user_id = current_uid;
  DELETE FROM public.intake_logs WHERE user_id = current_uid;
  DELETE FROM public.saved_meals WHERE user_id = current_uid;
  DELETE FROM public.workouts WHERE user_id = current_uid;
  DELETE FROM public.user_rank_history WHERE user_id = current_uid;
  DELETE FROM public.focus_sessions WHERE user_id = current_uid;
  DELETE FROM public.reading_logs WHERE user_id = current_uid;
  DELETE FROM public.reading_books WHERE user_id = current_uid;
  DELETE FROM public.screen_time_logs WHERE user_id = current_uid;
  DELETE FROM public.subjects WHERE user_id = current_uid;
  DELETE FROM public.grades WHERE user_id = current_uid;
  DELETE FROM public.mistakes WHERE user_id = current_uid;
  DELETE FROM public.deadlines WHERE user_id = current_uid;

  -- Reset targets to NULL in user_settings while preserving preferences
  UPDATE public.user_settings
  SET
    target_calories = NULL,
    target_protein_g = NULL,
    target_carbs_g = NULL,
    target_fats_g = NULL,
    water_target_ml = NULL,
    calorie_pacing = NULL,
    target_sleep_hours = NULL,
    bedtime_target = NULL,
    wake_time_target = NULL,
    daily_focus_goal_minutes = NULL,
    caffeine_cutoff_hours = NULL,
    screen_cutoff_minutes = NULL,
    updated_at = now()
  WHERE user_id = current_uid;
END;
$$;

-- Step 7: PostgreSQL RPC function: Hard delete entire account including auth.users
CREATE OR REPLACE FUNCTION public.delete_own_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  IF current_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all telemetry rows
  DELETE FROM public.weight_logs WHERE user_id = current_uid;
  DELETE FROM public.sleep_logs WHERE user_id = current_uid;
  DELETE FROM public.meal_logs WHERE user_id = current_uid;
  DELETE FROM public.intake_logs WHERE user_id = current_uid;
  DELETE FROM public.saved_meals WHERE user_id = current_uid;
  DELETE FROM public.workouts WHERE user_id = current_uid;
  DELETE FROM public.user_rank_history WHERE user_id = current_uid;
  DELETE FROM public.focus_sessions WHERE user_id = current_uid;
  DELETE FROM public.reading_logs WHERE user_id = current_uid;
  DELETE FROM public.reading_books WHERE user_id = current_uid;
  DELETE FROM public.screen_time_logs WHERE user_id = current_uid;
  DELETE FROM public.subjects WHERE user_id = current_uid;
  DELETE FROM public.grades WHERE user_id = current_uid;
  DELETE FROM public.mistakes WHERE user_id = current_uid;
  DELETE FROM public.deadlines WHERE user_id = current_uid;

  -- Delete user settings and profile
  DELETE FROM public.user_settings WHERE user_id = current_uid;
  DELETE FROM public.profiles WHERE id = current_uid;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = current_uid;
END;
$$;
