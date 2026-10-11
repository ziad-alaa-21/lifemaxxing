-- ==============================================================================
-- 005_saved_meals_and_nutrition_analytics.sql
-- Stage 6b: Saved Meals, Frequent Foods & Nutrition Analytics
-- Idempotent Migration - Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Update meal_logs source CHECK constraint to include 'saved'
DO $$
BEGIN
  -- Drop existing source check constraint if present
  ALTER TABLE public.meal_logs DROP CONSTRAINT IF EXISTS meal_logs_source_check;
  -- Re-add with 'saved' included
  ALTER TABLE public.meal_logs ADD CONSTRAINT meal_logs_source_check 
    CHECK (source IN ('dictionary', 'ai', 'manual', 'saved'));
EXCEPTION
  WHEN undefined_table THEN
    -- If meal_logs does not exist yet, 004 will create it
    NULL;
END $$;

-- 2. Add day completion tracking to profiles or meal_logs if desired
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_adherence_scores boolean DEFAULT false;

-- 3. Create saved_meals table
CREATE TABLE IF NOT EXISTS public.saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  items jsonb NOT NULL,
  total_calories integer,
  total_protein_g numeric DEFAULT 0,
  total_carbs_g numeric DEFAULT 0,
  total_fats_g numeric DEFAULT 0,
  is_favorite boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 4. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs (user_id, logged_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_food ON public.meal_logs (user_id, food_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_meals_user ON public.saved_meals (user_id) WHERE deleted_at IS NULL;

-- 5. Enable Row Level Security
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

-- 6. Idempotent Multi-Tenant RLS Policies
DROP POLICY IF EXISTS "Users can view own saved meals" ON public.saved_meals;
DROP POLICY IF EXISTS "Users can insert own saved meals" ON public.saved_meals;
DROP POLICY IF EXISTS "Users can update own saved meals" ON public.saved_meals;
DROP POLICY IF EXISTS "Users can delete own saved meals" ON public.saved_meals;

CREATE POLICY "Users can view own saved meals" ON public.saved_meals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved meals" ON public.saved_meals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved meals" ON public.saved_meals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved meals" ON public.saved_meals
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
