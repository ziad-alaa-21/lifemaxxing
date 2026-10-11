-- ==============================================================================
-- 007_mind_training_and_checkins.sql
-- Stage 7b: Mental Math Trainer, Mood/Energy Check-in & Discipline Commitments
-- Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Math Sessions Table (Completed training sessions only)
CREATE TABLE IF NOT EXISTS public.math_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode text NOT NULL CHECK (mode IN ('sprint', 'precision')),
  operation text NOT NULL CHECK (operation IN ('add', 'sub', 'mul', 'div', 'mixed')),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds numeric NOT NULL CHECK (duration_seconds > 0),
  score integer NOT NULL CHECK (score >= 0),
  accuracy_pct numeric NOT NULL CHECK (accuracy_pct >= 0 AND accuracy_pct <= 100),
  avg_response_time_ms integer NOT NULL CHECK (avg_response_time_ms >= 300),
  total_questions integer NOT NULL CHECK (total_questions > 0),
  correct_answers integer NOT NULL CHECK (correct_answers >= 0 AND correct_answers <= total_questions),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT math_sessions_ended_after_started CHECK (ended_at >= started_at)
);

-- 2. Math Attempts Table (Per-question breakdown for accuracy & speed by time of day)
CREATE TABLE IF NOT EXISTS public.math_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.math_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  operation text NOT NULL CHECK (operation IN ('add', 'sub', 'mul', 'div')),
  question text NOT NULL,
  answer integer NOT NULL,
  user_answer integer NOT NULL,
  correct boolean NOT NULL,
  response_time_ms integer NOT NULL CHECK (response_time_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Discipline Commitments Table (Active/custom commitment definitions, empty by default)
CREATE TABLE IF NOT EXISTS public.discipline_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 4. Discipline Logs Table (Daily snapshots of commitments so editing does not rewrite history)
CREATE TABLE IF NOT EXISTS public.discipline_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_count integer NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  completed_count integer NOT NULL DEFAULT 0 CHECK (completed_count >= 0 AND completed_count <= total_count),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT discipline_logs_user_date_key UNIQUE (user_id, logged_date)
);

-- 5. Mind Check-ins Table (Mood, Energy, Focus check-in per morning/midday/evening)
CREATE TABLE IF NOT EXISTS public.mind_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date NOT NULL,
  period text NOT NULL CHECK (period IN ('morning', 'midday', 'evening')),
  mood_score smallint NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
  energy_score smallint NOT NULL CHECK (energy_score >= 1 AND energy_score <= 5),
  focus_score smallint NOT NULL CHECK (focus_score >= 1 AND focus_score <= 5),
  context_tags text[] DEFAULT '{}'::text[],
  notes text,
  auto_context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT mind_checkins_user_date_period_key UNIQUE (user_id, logged_date, period)
);

-- 6. Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.math_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.math_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_checkins ENABLE ROW LEVEL SECURITY;

-- 7. Strict RLS Policies: auth.uid() = user_id
-- (No deleted_at in SELECT policy per architecture rules)

-- math_sessions
DROP POLICY IF EXISTS "Users can manage own math sessions" ON public.math_sessions;
CREATE POLICY "math_sessions_select" ON public.math_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "math_sessions_insert" ON public.math_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "math_sessions_update" ON public.math_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "math_sessions_delete" ON public.math_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- math_attempts
DROP POLICY IF EXISTS "Users can manage own math attempts" ON public.math_attempts;
CREATE POLICY "math_attempts_select" ON public.math_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "math_attempts_insert" ON public.math_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "math_attempts_update" ON public.math_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "math_attempts_delete" ON public.math_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- discipline_commitments
DROP POLICY IF EXISTS "Users can manage own discipline commitments" ON public.discipline_commitments;
CREATE POLICY "discipline_commitments_select" ON public.discipline_commitments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "discipline_commitments_insert" ON public.discipline_commitments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_commitments_update" ON public.discipline_commitments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_commitments_delete" ON public.discipline_commitments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- discipline_logs
DROP POLICY IF EXISTS "Users can manage own discipline logs" ON public.discipline_logs;
CREATE POLICY "discipline_logs_select" ON public.discipline_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "discipline_logs_insert" ON public.discipline_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_logs_update" ON public.discipline_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_logs_delete" ON public.discipline_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- mind_checkins
DROP POLICY IF EXISTS "Users can manage own mind checkins" ON public.mind_checkins;
CREATE POLICY "mind_checkins_select" ON public.mind_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mind_checkins_insert" ON public.mind_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mind_checkins_update" ON public.mind_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mind_checkins_delete" ON public.mind_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_math_sessions_user_date ON public.math_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_math_attempts_session ON public.math_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_math_attempts_user_op ON public.math_attempts(user_id, operation);
CREATE INDEX IF NOT EXISTS idx_discipline_commitments_user ON public.discipline_commitments(user_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_discipline_logs_user_date ON public.discipline_logs(user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_mind_checkins_user_date ON public.mind_checkins(user_id, logged_date DESC);
