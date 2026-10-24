-- ==============================================================================
-- Migration 017: Restore 4 Body Modules to user_modules (Full 11-module design)
--
-- Restores: module_workouts, module_nutrition, module_sleep, module_weight.
-- Recreates completeness and at-least-one-true check constraints across all 11 modules.
-- Safe: executes only if user_modules has 0 rows (or columns are NULL for pending users).
-- ==============================================================================

-- 1. Add the 4 Body module columns as nullable booleans (NULL = not chosen yet)
ALTER TABLE public.user_modules
  ADD COLUMN IF NOT EXISTS module_workouts boolean,
  ADD COLUMN IF NOT EXISTS module_nutrition boolean,
  ADD COLUMN IF NOT EXISTS module_sleep boolean,
  ADD COLUMN IF NOT EXISTS module_weight boolean;

-- 2. Drop existing 7-module check constraints
ALTER TABLE public.user_modules
  DROP CONSTRAINT IF EXISTS user_modules_completed_completeness_chk,
  DROP CONSTRAINT IF EXISTS user_modules_at_least_one_enabled_chk;

-- 3. Completeness Constraint across ALL 11 modules:
-- When has_completed_onboarding = true, none of the 11 module columns can be NULL.
ALTER TABLE public.user_modules
  ADD CONSTRAINT user_modules_completed_completeness_chk
  CHECK (
    has_completed_onboarding = false OR (
      module_workouts IS NOT NULL AND
      module_nutrition IS NOT NULL AND
      module_sleep IS NOT NULL AND
      module_weight IS NOT NULL AND
      module_focus IS NOT NULL AND
      module_math IS NOT NULL AND
      module_checkins IS NOT NULL AND
      module_discipline IS NOT NULL AND
      module_reading IS NOT NULL AND
      module_screentime IS NOT NULL AND
      module_school IS NOT NULL
    )
  );

-- 4. At-least-one-true Constraint across ALL 11 modules:
-- When has_completed_onboarding = true, at least one of the 11 modules must be true.
ALTER TABLE public.user_modules
  ADD CONSTRAINT user_modules_at_least_one_enabled_chk
  CHECK (
    has_completed_onboarding = false OR (
      module_workouts = true OR
      module_nutrition = true OR
      module_sleep = true OR
      module_weight = true OR
      module_focus = true OR
      module_math = true OR
      module_checkins = true OR
      module_discipline = true OR
      module_reading = true OR
      module_screentime = true OR
      module_school = true
    )
  );

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
