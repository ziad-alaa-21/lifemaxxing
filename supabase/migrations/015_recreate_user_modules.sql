-- ==============================================================================
-- Migration 015: Clean Recreate of user_modules (Approved 11-column design)
--
-- Replaces legacy surrogate key table with user_id as PRIMARY KEY,
-- eliminates module_mind_* and module_school_* legacy column names,
-- provisions the 7 active modules directly:
-- module_focus, module_math, module_checkins, module_discipline,
-- module_reading, module_screentime, module_school.
-- ==============================================================================

-- 1. Clean drop of existing user_modules table
DROP TABLE IF EXISTS public.user_modules CASCADE;

-- 2. Create user_modules with user_id as PRIMARY KEY (11 columns total)
CREATE TABLE public.user_modules (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_completed_onboarding boolean NOT NULL DEFAULT false,
  module_focus boolean,
  module_math boolean,
  module_checkins boolean,
  module_discipline boolean,
  module_reading boolean,
  module_screentime boolean,
  module_school boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Completeness Constraint:
-- When has_completed_onboarding = true, all 7 modules must be explicitly true or false (no NULLs).
ALTER TABLE public.user_modules
  DROP CONSTRAINT IF EXISTS user_modules_completed_completeness_chk;

ALTER TABLE public.user_modules
  ADD CONSTRAINT user_modules_completed_completeness_chk
  CHECK (
    has_completed_onboarding = false OR (
      module_focus IS NOT NULL AND
      module_math IS NOT NULL AND
      module_checkins IS NOT NULL AND
      module_discipline IS NOT NULL AND
      module_reading IS NOT NULL AND
      module_screentime IS NOT NULL AND
      module_school IS NOT NULL
    )
  );

-- 4. At-least-one-true Constraint:
-- When has_completed_onboarding = true, at least one module must be true.
ALTER TABLE public.user_modules
  DROP CONSTRAINT IF EXISTS user_modules_at_least_one_enabled_chk;

ALTER TABLE public.user_modules
  ADD CONSTRAINT user_modules_at_least_one_enabled_chk
  CHECK (
    has_completed_onboarding = false OR (
      module_focus = true OR
      module_math = true OR
      module_checkins = true OR
      module_discipline = true OR
      module_reading = true OR
      module_screentime = true OR
      module_school = true
    )
  );

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- 6. Strict RLS Policies (Drop first then create)
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

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
