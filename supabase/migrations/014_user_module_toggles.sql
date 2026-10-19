-- ==============================================================================
-- Migration 014: User Module Toggles & First-Time Onboarding
-- Schema for customizable modular pillars, explicit onboarding choices,
-- completeness constraints, strict RLS, and safe backfill for active users.
-- ==============================================================================

-- 1. Create table public.user_modules
-- Note: Module columns intentionally have NO DEFAULT (NULL = not chosen yet).
-- New users get explicit values from the onboarding screen, never from column defaults.
CREATE TABLE IF NOT EXISTS public.user_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  has_completed_onboarding boolean NOT NULL DEFAULT false,
  module_workouts boolean,
  module_nutrition boolean,
  module_sleep boolean,
  module_weight boolean,
  module_mind_focus boolean,
  module_mind_discipline boolean,
  module_mind_reading boolean,
  module_mind_screentime boolean,
  module_school_timetable boolean,
  module_school_topics boolean,
  module_school_mistakes boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Completeness Constraint:
-- When has_completed_onboarding = true, none of the 11 module columns is NULL.
ALTER TABLE public.user_modules
DROP CONSTRAINT IF EXISTS user_modules_completed_completeness_chk;

ALTER TABLE public.user_modules
ADD CONSTRAINT user_modules_completed_completeness_chk
CHECK (
  has_completed_onboarding = false OR (
    module_workouts IS NOT NULL AND
    module_nutrition IS NOT NULL AND
    module_sleep IS NOT NULL AND
    module_weight IS NOT NULL AND
    module_mind_focus IS NOT NULL AND
    module_mind_discipline IS NOT NULL AND
    module_mind_reading IS NOT NULL AND
    module_mind_screentime IS NOT NULL AND
    module_school_timetable IS NOT NULL AND
    module_school_topics IS NOT NULL AND
    module_school_mistakes IS NOT NULL
  )
);

-- 3. At-least-one-true Constraint:
-- When has_completed_onboarding = true, at least one module column must be true.
ALTER TABLE public.user_modules
DROP CONSTRAINT IF EXISTS user_modules_at_least_one_enabled_chk;

ALTER TABLE public.user_modules
ADD CONSTRAINT user_modules_at_least_one_enabled_chk
CHECK (
  has_completed_onboarding = false OR (
    module_workouts = true OR
    module_nutrition = true OR
    module_sleep = true OR
    module_weight = true OR
    module_mind_focus = true OR
    module_mind_discipline = true OR
    module_mind_reading = true OR
    module_mind_screentime = true OR
    module_school_timetable = true OR
    module_school_topics = true OR
    module_school_mistakes = true
  )
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies
DROP POLICY IF EXISTS "Users can read own modules" ON public.user_modules;
CREATE POLICY "Users can read own modules"
  ON public.user_modules
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own modules" ON public.user_modules;
CREATE POLICY "Users can insert own modules"
  ON public.user_modules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own modules" ON public.user_modules;
CREATE POLICY "Users can update own modules"
  ON public.user_modules
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own modules" ON public.user_modules;
CREATE POLICY "Users can delete own modules"
  ON public.user_modules
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Safe backfill for existing active users
-- Backfills all existing profiles where the user is NOT deleted.
-- Existing users are marked has_completed_onboarding = true with all modules enabled.
INSERT INTO public.user_modules (
  user_id,
  has_completed_onboarding,
  module_workouts,
  module_nutrition,
  module_sleep,
  module_weight,
  module_mind_focus,
  module_mind_discipline,
  module_mind_reading,
  module_mind_screentime,
  module_school_timetable,
  module_school_topics,
  module_school_mistakes
)
SELECT 
  p.id,
  true,
  true, true, true, true, true, true, true, true, true, true, true
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 7. Signup Mechanism Note:
-- The application relies on the deterministic, RLS-compliant mechanism:
-- "Idempotent Upsert on First Sign-in" (ensureUserModules in src/lib/modules.ts).
-- This runs under the authenticated user's session with auth.uid() = user_id,
-- eliminating cross-schema trigger permission failures on auth.users in Supabase.
