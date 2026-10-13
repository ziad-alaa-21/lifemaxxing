-- ==============================================================================
-- 011_academic_schedule_and_analytics.sql
-- Stage 8b-2: Academic Timetable, Study Hours, Weekly Target & Analytics
-- Idempotent Migration for Supabase SQL Editor
-- ==============================================================================

-- 1. FIX FOCUS SESSIONS ON DELETE SUBJECT INTEGRITY
-- Before deleting a subject, safely nullify subject_id in focus_sessions
-- without trying to nullify the NOT NULL user_id column.
CREATE OR REPLACE FUNCTION public.fn_nullify_focus_sessions_subject()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.focus_sessions 
  SET subject_id = NULL 
  WHERE subject_id = OLD.id AND user_id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nullify_focus_sessions_subject ON public.subjects;
CREATE TRIGGER trg_nullify_focus_sessions_subject
  BEFORE DELETE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_nullify_focus_sessions_subject();

ALTER TABLE public.focus_sessions DROP CONSTRAINT IF EXISTS fk_focus_sessions_subject_user;
ALTER TABLE public.focus_sessions ADD CONSTRAINT fk_focus_sessions_subject_user 
  FOREIGN KEY (subject_id, user_id) 
  REFERENCES public.subjects(id, user_id) 
  ON DELETE NO ACTION;

-- 2. ACADEMIC SCHEDULE TABLE (TIMETABLE)
CREATE TABLE IF NOT EXISTS public.academic_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text CHECK (location IS NULL OR length(trim(location)) <= 100),
  session_type text NOT NULL CHECK (session_type IN ('lecture', 'lab', 'section', 'seminar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  -- Duration constraint: between 15 minutes and 12 hours
  CONSTRAINT chk_schedule_duration CHECK (
    end_time > start_time AND
    (end_time - start_time) >= interval '15 minutes' AND 
    (end_time - start_time) <= interval '12 hours'
  ),

  -- Composite Link Integrity with subjects
  CONSTRAINT fk_schedule_subject_user FOREIGN KEY (subject_id, user_id) 
    REFERENCES public.subjects(id, user_id) ON DELETE CASCADE
);

-- Unique constraint: prevent duplicate identical sessions among non-deleted rows
DROP INDEX IF EXISTS idx_schedule_no_duplicate_sessions;
CREATE UNIQUE INDEX idx_schedule_no_duplicate_sessions 
  ON public.academic_schedule (user_id, subject_id, day_of_week, start_time, end_time) 
  WHERE deleted_at IS NULL;

-- Partial index for active timetable querying
CREATE INDEX IF NOT EXISTS idx_academic_schedule_active 
  ON public.academic_schedule (user_id, day_of_week, start_time) 
  WHERE deleted_at IS NULL;

-- 3. ENABLE ROW LEVEL SECURITY & 4 CRUD POLICIES
ALTER TABLE public.academic_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own schedule" ON public.academic_schedule;
DROP POLICY IF EXISTS "Users can insert own schedule" ON public.academic_schedule;
DROP POLICY IF EXISTS "Users can update own schedule" ON public.academic_schedule;
DROP POLICY IF EXISTS "Users can delete own schedule" ON public.academic_schedule;

CREATE POLICY "Users can view own schedule" ON public.academic_schedule
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule" ON public.academic_schedule
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule" ON public.academic_schedule
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule" ON public.academic_schedule
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. TYPED USER SETTINGS COLUMNS FOR STUDY TARGET & WEEK-START
-- Safe nullable typed columns with explicit bounds
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS weekly_study_target_minutes integer DEFAULT NULL 
  CHECK (weekly_study_target_minutes IS NULL OR (weekly_study_target_minutes >= 30 AND weekly_study_target_minutes <= 10080));

ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS first_day_of_week integer DEFAULT NULL 
  CHECK (first_day_of_week IS NULL OR (first_day_of_week BETWEEN 0 AND 6));
