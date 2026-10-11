-- ==============================================================================
-- 006_mind_and_focus_engine.sql
-- Stage 7a: Mind & Focus Sessions Engine
-- Idempotent Migration - Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Create focus_sessions table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  task_category text NOT NULL DEFAULT 'Coding',
  task_name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('sprint_50', 'ultradian_90', 'pomodoro_25', 'custom')),
  planned_minutes integer NOT NULL CHECK (planned_minutes > 0),
  actual_minutes integer NOT NULL CHECK (actual_minutes >= 1 AND actual_minutes <= 600),
  paused_seconds integer NOT NULL DEFAULT 0 CHECK (paused_seconds >= 0),
  status text NOT NULL CHECK (status IN ('completed', 'ended_early', 'abandoned')),
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  friction_tags text[] DEFAULT '{}',
  notes text,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL DEFAULT now(),
  logged_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT focus_sessions_ended_after_started CHECK (ended_at >= started_at)
);

-- If table already existed with older schema, alter columns idempotently:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'focus_sessions' AND column_name = 'subject_id') THEN
    ALTER TABLE public.focus_sessions ADD COLUMN subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'focus_sessions' AND column_name = 'task_category') THEN
    ALTER TABLE public.focus_sessions ADD COLUMN task_category text NOT NULL DEFAULT 'Coding';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'focus_sessions' AND column_name = 'planned_minutes') THEN
    ALTER TABLE public.focus_sessions ADD COLUMN planned_minutes integer NOT NULL DEFAULT 50 CHECK (planned_minutes > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'focus_sessions' AND column_name = 'actual_minutes') THEN
    ALTER TABLE public.focus_sessions ADD COLUMN actual_minutes integer NOT NULL DEFAULT 50 CHECK (actual_minutes >= 1 AND actual_minutes <= 600);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'focus_sessions' AND column_name = 'paused_seconds') THEN
    ALTER TABLE public.focus_sessions ADD COLUMN paused_seconds integer NOT NULL DEFAULT 0 CHECK (paused_seconds >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'focus_sessions' AND column_name = 'status') THEN
    ALTER TABLE public.focus_sessions ADD COLUMN status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'ended_early', 'abandoned'));
    ALTER TABLE public.focus_sessions ALTER COLUMN status DROP DEFAULT;
  END IF;
END $$;

-- 2. Add Focus preferences to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_focus_goal_minutes integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_focus_mode text DEFAULT 'sprint_50';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sound_chime_enabled boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sound_volume integer DEFAULT 80;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vibration_enabled boolean DEFAULT true;

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON public.focus_sessions (user_id, logged_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_subject ON public.focus_sessions (user_id, subject_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_status ON public.focus_sessions (user_id, status) WHERE deleted_at IS NULL;

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
