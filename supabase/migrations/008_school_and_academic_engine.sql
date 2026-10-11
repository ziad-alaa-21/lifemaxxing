-- ==============================================================================
-- 007_school_and_academic_engine.sql
-- Stage 8: School & Academic Engine (Grades, Mistakes, Deadlines)
-- Idempotent Migration - Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Ensure subjects table has proper columns and constraints
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS target_grade numeric;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS exam_date timestamptz;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Ensure grades table has proper columns and constraints
CREATE TABLE IF NOT EXISTS public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('quiz', 'exam', 'midterm', 'final', 'assignment', 'project')),
  title text NOT NULL,
  mark_achieved numeric NOT NULL CHECK (mark_achieved >= 0),
  mark_total numeric NOT NULL CHECK (mark_total > 0),
  weight_pct numeric CHECK (weight_pct >= 0 AND weight_pct <= 100),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 3. Ensure mistakes table has proper columns and constraints
CREATE TABLE IF NOT EXISTS public.mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic text NOT NULL,
  question_context text NOT NULL,
  error_made text NOT NULL,
  correct_solution text NOT NULL,
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major')),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 4. Create deadlines table for exams, homework, and assignment due dates
CREATE TABLE IF NOT EXISTS public.deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'exam' CHECK (type IN ('exam', 'quiz', 'assignment', 'project', 'reading')),
  due_date timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grades_user_subject ON public.grades (user_id, subject_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grades_entry_date ON public.grades (user_id, entry_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mistakes_user_subject ON public.mistakes (user_id, subject_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mistakes_resolved ON public.mistakes (user_id, resolved) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deadlines_user_due ON public.deadlines (user_id, due_date) WHERE deleted_at IS NULL;

-- 6. Enable Row Level Security
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- 7. Multi-Tenant RLS Policies (auth.uid() = user_id)
-- Grades RLS
DROP POLICY IF EXISTS "Users can view own grades" ON public.grades;
DROP POLICY IF EXISTS "Users can insert own grades" ON public.grades;
DROP POLICY IF EXISTS "Users can update own grades" ON public.grades;
DROP POLICY IF EXISTS "Users can delete own grades" ON public.grades;

CREATE POLICY "Users can view own grades" ON public.grades
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grades" ON public.grades
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grades" ON public.grades
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own grades" ON public.grades
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Mistakes RLS
DROP POLICY IF EXISTS "Users can view own mistakes" ON public.mistakes;
DROP POLICY IF EXISTS "Users can insert own mistakes" ON public.mistakes;
DROP POLICY IF EXISTS "Users can update own mistakes" ON public.mistakes;
DROP POLICY IF EXISTS "Users can delete own mistakes" ON public.mistakes;

CREATE POLICY "Users can view own mistakes" ON public.mistakes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mistakes" ON public.mistakes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mistakes" ON public.mistakes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mistakes" ON public.mistakes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Deadlines RLS
DROP POLICY IF EXISTS "Users can view own deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Users can insert own deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Users can update own deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Users can delete own deadlines" ON public.deadlines;

CREATE POLICY "Users can view own deadlines" ON public.deadlines
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deadlines" ON public.deadlines
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deadlines" ON public.deadlines
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deadlines" ON public.deadlines
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
