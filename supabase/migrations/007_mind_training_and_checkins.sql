-- ==============================================================================
-- 007_mind_training_and_checkins.sql (REVISED)
-- Stage 7b: Mental Math Trainer, Mood/Energy Check-in & Discipline Commitments
--
-- Revisions applied:
-- 1. Composite UNIQUE (id, user_id) on math_sessions and composite FK (session_id, user_id)
--    on math_attempts to guarantee cross-tenant attempt injection is physically impossible.
-- 2. Server-side trust checks on math_sessions:
--    - accuracy_pct = round((correct_answers::numeric / total_questions) * 100, 0)
--    - score = correct_answers (sprint) OR accuracy_pct (precision)
--    - avg_response_time_ms >= 300 (minimum human cognitive threshold)
--    - precision mode total_questions = 20
--    - atomic SECURITY DEFINER RPC public.submit_math_session(...) computing all values
-- 3. Partial unique indexes WHERE deleted_at IS NULL on mind_checkins (user_id, logged_date, period)
--    and discipline_logs (user_id, logged_date) so soft-delete and re-logging works.
-- 4. Strict length limits on notes (<=1000), commitment text (1..200), question text (<=100),
--    context_tags (cardinality<=10, length<=500), and JSON validation function for discipline_logs.items.
-- 5. auto_context removed from mind_checkins (derived on-the-fly, no duplicate/stale state).
-- 6. Scales and operation strings strictly matched to UI wording (mood, energy, focus: 1..5; ops: add, sub, mul, div, mixed).
-- 0. Clean drop of Mind tables (0 rows currently exist in database)
DROP TABLE IF EXISTS public.math_attempts CASCADE;
DROP TABLE IF EXISTS public.math_sessions CASCADE;
DROP TABLE IF EXISTS public.discipline_commitments CASCADE;
DROP TABLE IF EXISTS public.discipline_logs CASCADE;
DROP TABLE IF EXISTS public.mind_checkins CASCADE;

-- 1. Helper function to strictly validate discipline_logs items JSON shape
CREATE OR REPLACE FUNCTION public.validate_discipline_items(items jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  elem jsonb;
BEGIN
  IF jsonb_typeof(items) != 'array' THEN
    RETURN false;
  END IF;
  FOR elem IN SELECT * FROM jsonb_array_elements(items) LOOP
    IF jsonb_typeof(elem) != 'object' THEN
      RETURN false;
    END IF;
    IF NOT (elem ? 'id' AND elem ? 'text' AND elem ? 'completed') THEN
      RETURN false;
    END IF;
    IF jsonb_typeof(elem->'id') != 'string' OR
       jsonb_typeof(elem->'text') != 'string' OR
       jsonb_typeof(elem->'completed') != 'boolean' THEN
      RETURN false;
    END IF;
    IF char_length(elem->>'text') > 200 OR char_length(trim(elem->>'text')) = 0 THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

-- 2. Math Sessions Table (Completed training sessions only)
CREATE TABLE public.math_sessions (
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
  CONSTRAINT math_sessions_user_id_id_key UNIQUE (id, user_id),
  CONSTRAINT math_sessions_ended_after_started CHECK (ended_at >= started_at),
  CONSTRAINT chk_math_sessions_accuracy CHECK (accuracy_pct = round((correct_answers::numeric / total_questions) * 100, 0)),
  CONSTRAINT chk_math_sessions_score CHECK (
    (mode = 'sprint' AND score = correct_answers) OR
    (mode = 'precision' AND score = round((correct_answers::numeric / total_questions) * 100, 0))
  ),
  CONSTRAINT chk_math_sessions_precision_count CHECK (mode != 'precision' OR total_questions = 20)
);

-- 3. Math Attempts Table (Per-question breakdown for accuracy & speed)
CREATE TABLE public.math_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('add', 'sub', 'mul', 'div')),
  question text NOT NULL CHECK (char_length(question) <= 100),
  answer integer NOT NULL,
  user_answer integer NOT NULL,
  correct boolean NOT NULL,
  response_time_ms integer NOT NULL CHECK (response_time_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_math_attempts_session_user FOREIGN KEY (session_id, user_id) REFERENCES public.math_sessions (id, user_id) ON DELETE CASCADE,
  CONSTRAINT fk_math_attempts_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Discipline Commitments Table (Active/custom commitment definitions, empty by default)
CREATE TABLE public.discipline_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL CHECK (char_length(trim(text)) >= 1 AND char_length(text) <= 200),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 5. Discipline Logs Table (Daily snapshots of commitments so editing does not rewrite history)
CREATE TABLE public.discipline_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (public.validate_discipline_items(items)),
  total_count integer NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  completed_count integer NOT NULL DEFAULT 0 CHECK (completed_count >= 0 AND completed_count <= total_count),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Partial unique index for discipline_logs (replaces plain unique constraint to support soft-delete)
CREATE UNIQUE INDEX IF NOT EXISTS idx_discipline_logs_user_date_active 
  ON public.discipline_logs (user_id, logged_date) 
  WHERE deleted_at IS NULL;

-- 6. Mind Check-ins Table (Mood, Energy, Focus check-in per morning/midday/evening; auto_context removed)
CREATE TABLE public.mind_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date NOT NULL,
  period text NOT NULL CHECK (period IN ('morning', 'midday', 'evening')),
  mood_score smallint NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
  energy_score smallint NOT NULL CHECK (energy_score >= 1 AND energy_score <= 5),
  focus_score smallint NOT NULL CHECK (focus_score >= 1 AND focus_score <= 5),
  context_tags text[] DEFAULT '{}'::text[] CHECK (
    context_tags IS NULL OR (cardinality(context_tags) <= 10 AND char_length(array_to_string(context_tags, '')) <= 500)
  ),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Partial unique index for mind_checkins (replaces plain unique constraint to support soft-delete)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mind_checkins_user_date_period_active 
  ON public.mind_checkins (user_id, logged_date, period) 
  WHERE deleted_at IS NULL;

-- 6. Atomic Math Session Submission Function (Server-Side Trust Calculation)
CREATE OR REPLACE FUNCTION public.submit_math_session(
  p_mode text,
  p_operation text,
  p_difficulty text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_attempts jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_session_id uuid;
  v_total integer;
  v_correct integer := 0;
  v_total_time_ms bigint := 0;
  v_avg_speed integer;
  v_accuracy numeric;
  v_score integer;
  v_duration numeric;
  v_att jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authenticated user required';
  END IF;

  IF jsonb_typeof(p_attempts) != 'array' OR jsonb_array_length(p_attempts) = 0 THEN
    RAISE EXCEPTION 'Invalid attempts payload: non-empty array required';
  END IF;

  v_total := jsonb_array_length(p_attempts);
  IF p_mode = 'precision' AND v_total != 20 THEN
    RAISE EXCEPTION 'Precision mode requires exactly 20 questions';
  END IF;

  FOR v_att IN SELECT * FROM jsonb_array_elements(p_attempts) LOOP
    IF (v_att->>'correct')::boolean IS TRUE THEN
      v_correct := v_correct + 1;
    END IF;
    v_total_time_ms := v_total_time_ms + COALESCE((v_att->>'response_time_ms')::bigint, 0);
  END LOOP;

  v_avg_speed := round(v_total_time_ms::numeric / v_total);
  IF v_avg_speed < 300 THEN
    RAISE EXCEPTION 'Impossible average response time (% ms). Minimum human cognitive threshold is 300ms', v_avg_speed;
  END IF;

  v_accuracy := round((v_correct::numeric / v_total) * 100, 0);
  IF p_mode = 'sprint' THEN
    v_score := v_correct;
  ELSE
    v_score := v_accuracy::integer;
  END IF;

  v_duration := GREATEST(1, round(EXTRACT(EPOCH FROM (p_ended_at - p_started_at))));

  INSERT INTO public.math_sessions (
    user_id, mode, operation, difficulty, started_at, ended_at,
    duration_seconds, score, accuracy_pct, avg_response_time_ms,
    total_questions, correct_answers
  ) VALUES (
    v_user_id, p_mode, p_operation, p_difficulty, p_started_at, p_ended_at,
    v_duration, v_score, v_accuracy, v_avg_speed,
    v_total, v_correct
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.math_attempts (
    session_id, user_id, operation, question, answer, user_answer, correct, response_time_ms
  )
  SELECT
    v_session_id,
    v_user_id,
    (att.item->>'operation')::text,
    (att.item->>'question')::text,
    (att.item->>'answer')::integer,
    (att.item->>'user_answer')::integer,
    (att.item->>'correct')::boolean,
    (att.item->>'response_time_ms')::integer
  FROM jsonb_array_elements(p_attempts) AS att(item);

  RETURN v_session_id;
END;
$$;

-- 7. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.math_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.math_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_checkins ENABLE ROW LEVEL SECURITY;

-- 8. Strict RLS Policies: auth.uid() = user_id
-- (DROP POLICY IF EXISTS first for idempotency)

-- math_sessions
DROP POLICY IF EXISTS "math_sessions_select" ON public.math_sessions;
DROP POLICY IF EXISTS "math_sessions_insert" ON public.math_sessions;
DROP POLICY IF EXISTS "math_sessions_update" ON public.math_sessions;
DROP POLICY IF EXISTS "math_sessions_delete" ON public.math_sessions;
DROP POLICY IF EXISTS "Users can manage own math sessions" ON public.math_sessions;

CREATE POLICY "math_sessions_select" ON public.math_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "math_sessions_insert" ON public.math_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "math_sessions_update" ON public.math_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "math_sessions_delete" ON public.math_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- math_attempts
DROP POLICY IF EXISTS "math_attempts_select" ON public.math_attempts;
DROP POLICY IF EXISTS "math_attempts_insert" ON public.math_attempts;
DROP POLICY IF EXISTS "math_attempts_update" ON public.math_attempts;
DROP POLICY IF EXISTS "math_attempts_delete" ON public.math_attempts;
DROP POLICY IF EXISTS "Users can manage own math attempts" ON public.math_attempts;

CREATE POLICY "math_attempts_select" ON public.math_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "math_attempts_insert" ON public.math_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "math_attempts_update" ON public.math_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "math_attempts_delete" ON public.math_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- discipline_commitments
DROP POLICY IF EXISTS "discipline_commitments_select" ON public.discipline_commitments;
DROP POLICY IF EXISTS "discipline_commitments_insert" ON public.discipline_commitments;
DROP POLICY IF EXISTS "discipline_commitments_update" ON public.discipline_commitments;
DROP POLICY IF EXISTS "discipline_commitments_delete" ON public.discipline_commitments;
DROP POLICY IF EXISTS "Users can manage own discipline commitments" ON public.discipline_commitments;

CREATE POLICY "discipline_commitments_select" ON public.discipline_commitments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "discipline_commitments_insert" ON public.discipline_commitments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_commitments_update" ON public.discipline_commitments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_commitments_delete" ON public.discipline_commitments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- discipline_logs
DROP POLICY IF EXISTS "discipline_logs_select" ON public.discipline_logs;
DROP POLICY IF EXISTS "discipline_logs_insert" ON public.discipline_logs;
DROP POLICY IF EXISTS "discipline_logs_update" ON public.discipline_logs;
DROP POLICY IF EXISTS "discipline_logs_delete" ON public.discipline_logs;
DROP POLICY IF EXISTS "Users can manage own discipline logs" ON public.discipline_logs;

CREATE POLICY "discipline_logs_select" ON public.discipline_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "discipline_logs_insert" ON public.discipline_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_logs_update" ON public.discipline_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_logs_delete" ON public.discipline_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- mind_checkins
DROP POLICY IF EXISTS "mind_checkins_select" ON public.mind_checkins;
DROP POLICY IF EXISTS "mind_checkins_insert" ON public.mind_checkins;
DROP POLICY IF EXISTS "mind_checkins_update" ON public.mind_checkins;
DROP POLICY IF EXISTS "mind_checkins_delete" ON public.mind_checkins;
DROP POLICY IF EXISTS "Users can manage own mind checkins" ON public.mind_checkins;

CREATE POLICY "mind_checkins_select" ON public.mind_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mind_checkins_insert" ON public.mind_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mind_checkins_update" ON public.mind_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mind_checkins_delete" ON public.mind_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_math_sessions_user_date ON public.math_sessions(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_math_attempts_session ON public.math_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_math_attempts_user_op ON public.math_attempts(user_id, operation);
CREATE INDEX IF NOT EXISTS idx_discipline_commitments_user ON public.discipline_commitments(user_id, sort_order ASC) WHERE deleted_at IS NULL;

-- 10. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
