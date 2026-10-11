-- ==============================================================================
-- 004_nutrition_and_intake.sql
-- Stage 6: Nutrition & Intake Telemetry Engine
-- Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Profiles columns for nutrition, anthropometrics & intake targets (nullable, no fake defaults)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_year integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('male', 'female'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_calories integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_protein_g integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_carbs_g integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_fats_g integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS water_target_ml integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calorie_pacing text CHECK (calorie_pacing IN ('conservative', 'optimal', 'aggressive'));

-- 2. Meal Logs Table (Single Source of Truth with rescaling metadata)
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'serving',
  calories integer,
  protein_g numeric DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  fats_g numeric DEFAULT 0,
  source text NOT NULL CHECK (source IN ('dictionary', 'ai', 'manual')),
  confidence text CHECK (confidence IN ('high', 'medium', 'low', 'could_not_estimate')),
  raw_query text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 3. Intake Logs Table (Per-entry water & caffeine logs with timestamp)
CREATE TABLE IF NOT EXISTS public.intake_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('water', 'caffeine')),
  amount integer NOT NULL CHECK (amount > 0), -- ml for water, mg for caffeine
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 4. Enable Row Level Security
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_logs ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if re-running
DROP POLICY IF EXISTS "Users can view own meal logs" ON public.meal_logs;
DROP POLICY IF EXISTS "Users can insert own meal logs" ON public.meal_logs;
DROP POLICY IF EXISTS "Users can update own meal logs" ON public.meal_logs;
DROP POLICY IF EXISTS "Users can delete own meal logs" ON public.meal_logs;

DROP POLICY IF EXISTS "Users can view own intake logs" ON public.intake_logs;
DROP POLICY IF EXISTS "Users can insert own intake logs" ON public.intake_logs;
DROP POLICY IF EXISTS "Users can update own intake logs" ON public.intake_logs;
DROP POLICY IF EXISTS "Users can delete own intake logs" ON public.intake_logs;

-- 5. Strict Multi-Tenant CRUD Policies (SELECT is strictly auth.uid() = user_id per user mandate)
CREATE POLICY "Users can view own meal logs" ON public.meal_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal logs" ON public.meal_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal logs" ON public.meal_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal logs" ON public.meal_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Intake logs policies
CREATE POLICY "Users can view own intake logs" ON public.intake_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intake logs" ON public.intake_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intake logs" ON public.intake_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own intake logs" ON public.intake_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
