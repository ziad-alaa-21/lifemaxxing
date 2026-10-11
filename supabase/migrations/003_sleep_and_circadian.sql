-- ==============================================================================
-- 003_sleep_and_circadian.sql
-- Sleep & Circadian Telemetry Engine
-- Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Profiles additions for timezone & sleep settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sleep_target_hours numeric DEFAULT 8.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS caffeine_cutoff_hours numeric DEFAULT 10.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS screen_cutoff_minutes numeric DEFAULT 60;

-- 2. Create sleep_logs table
CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sleep_date date NOT NULL,
  bedtime timestamptz NOT NULL,
  wake_time timestamptz NOT NULL,
  duration_minutes integer GENERATED ALWAYS AS (
    ROUND((EXTRACT(EPOCH FROM wake_time) - EXTRACT(EPOCH FROM bedtime)) / 60)::integer
  ) STORED,
  quality_rating integer CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
  awakenings_count integer DEFAULT 0 CHECK (awakenings_count >= 0),
  nap_minutes integer DEFAULT 0 CHECK (nap_minutes >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT check_sleep_duration CHECK (duration_minutes >= 60 AND duration_minutes <= 960),
  CONSTRAINT unique_user_sleep_date UNIQUE (user_id, sleep_date)
);

-- 3. Enable RLS
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS "Users can view own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can insert own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can update own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Users can delete own sleep logs" ON public.sleep_logs;

-- 4. Strict CRUD policies
-- Per user mandate: SELECT policy is strictly auth.uid() = user_id (no deleted_at condition).
-- Soft delete filtering (deleted_at is null) is handled in application queries.
CREATE POLICY "Users can view own sleep logs" ON public.sleep_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sleep logs" ON public.sleep_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep logs" ON public.sleep_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep logs" ON public.sleep_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
