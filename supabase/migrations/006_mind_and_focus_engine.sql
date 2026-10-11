-- ==============================================================================
-- 006_mind_and_focus_engine.sql
-- Stage 7: Mind & Ultradian Focus Engine
-- Idempotent Migration - Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Create focus_sessions table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('ultradian_90', 'sprint_50', 'pomodoro_25', 'custom')),
  work_duration_minutes integer NOT NULL CHECK (work_duration_minutes > 0),
  break_duration_minutes integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT true,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  friction_tags text[] DEFAULT '{}',
  notes text,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL DEFAULT now(),
  logged_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Add Mind preferences to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_focus_goal_minutes integer DEFAULT 180;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_focus_mode text DEFAULT 'ultradian_90';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sound_chime_enabled boolean DEFAULT true;

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON public.focus_sessions (user_id, logged_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_mode ON public.focus_sessions (user_id, mode) WHERE deleted_at IS NULL;

-- 4. Enable Row Level Security
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Idempotent Multi-Tenant RLS Policies (auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view own focus sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can insert own focus sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can update own focus sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can delete own focus sessions" ON public.focus_sessions;

CREATE POLICY "Users can view own focus sessions" ON public.focus_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus sessions" ON public.focus_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus sessions" ON public.focus_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus sessions" ON public.focus_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
