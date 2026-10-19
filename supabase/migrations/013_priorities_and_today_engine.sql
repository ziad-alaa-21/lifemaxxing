-- ==============================================================================
-- 010_priorities_and_today_engine.sql
-- Stage 10: Priorities Task Engine, Workout Split & Today Command Center
-- ==============================================================================

-- 1. Create priorities table with multi-tenant RLS
CREATE TABLE IF NOT EXISTS public.priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  priority_date date NOT NULL,
  title text NOT NULL,
  source text NOT NULL CHECK (source IN ('workout_plan', 'deadline', 'study_goal', 'custom')),
  source_id text,
  estimate_minutes integer CHECK (estimate_minutes > 0),
  sort_order integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  auto_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE public.priorities ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant RLS Policies
DROP POLICY IF EXISTS "Users can view own priorities" ON public.priorities;
CREATE POLICY "Users can view own priorities" ON public.priorities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own priorities" ON public.priorities;
CREATE POLICY "Users can insert own priorities" ON public.priorities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own priorities" ON public.priorities;
CREATE POLICY "Users can update own priorities" ON public.priorities
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own priorities" ON public.priorities;
CREATE POLICY "Users can delete own priorities" ON public.priorities
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Performance index for daily retrieval
CREATE INDEX IF NOT EXISTS idx_priorities_user_date 
  ON public.priorities(user_id, priority_date) 
  WHERE deleted_at IS NULL;

-- 2. Add workout_split and quick increment columns to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_split text DEFAULT 'Push / Pull / Legs';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_wake_time text DEFAULT '07:00';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_bedtime text DEFAULT '23:00';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS water_increment_ml integer DEFAULT 250;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS caffeine_increment_mg integer DEFAULT 100;
