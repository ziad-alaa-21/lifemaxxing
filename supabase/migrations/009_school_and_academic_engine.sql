-- ==============================================================================
-- 009_school_and_academic_engine.sql
-- Stage 8: School & Academic Engine (Subjects, Grades, Deadlines, Mistakes)
-- Idempotent Migration with Link Integrity & Composite Foreign Keys
-- ==============================================================================

-- 1. Ensure subjects table has proper columns and constraints
ALTER TABLE public.subjects DROP COLUMN IF EXISTS exam_date;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS target_grade numeric;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Target grade 0 to 100 check
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS chk_subjects_target_grade;
ALTER TABLE public.subjects ADD CONSTRAINT chk_subjects_target_grade 
  CHECK (target_grade IS NULL OR (target_grade >= 0 AND target_grade <= 100));

-- Prohibit Volt Lime #c6ff3d (reserved for Body domain)
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS chk_subjects_color_no_lime;
ALTER TABLE public.subjects ADD CONSTRAINT chk_subjects_color_no_lime 
  CHECK (color IS NULL OR lower(trim(color)) != '#c6ff3d');

-- Enforce composite uniqueness on (id, user_id) for link integrity foreign keys
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS uq_subjects_id_user_id CASCADE;
ALTER TABLE public.subjects ADD CONSTRAINT uq_subjects_id_user_id UNIQUE (id, user_id);

-- Case-insensitive unique name per user among active (non-deleted) subjects
DROP INDEX IF EXISTS idx_subjects_user_name_unique;
CREATE UNIQUE INDEX idx_subjects_user_name_unique 
  ON public.subjects (user_id, lower(trim(name))) 
  WHERE deleted_at IS NULL;

-- 2. Ensure grades table exists and has proper columns and constraints
CREATE TABLE IF NOT EXISTS public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  mark_achieved numeric NOT NULL,
  mark_total numeric NOT NULL,
  weight_pct numeric,
  entry_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Drop old foreign keys and attach composite foreign key (subject_id, user_id)
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_subject_id_fkey;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS fk_grades_subject_user;
ALTER TABLE public.grades ADD CONSTRAINT fk_grades_subject_user 
  FOREIGN KEY (subject_id, user_id) 
  REFERENCES public.subjects(id, user_id) 
  ON DELETE CASCADE;

-- Drop default CURRENT_DATE so entry_date is strictly provided from user timezone
ALTER TABLE public.grades ALTER COLUMN entry_date DROP DEFAULT;

-- Restrict grade types to ONLY 'quiz' and 'big_exam'
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_type_check;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS chk_grades_type;
ALTER TABLE public.grades ADD CONSTRAINT chk_grades_type 
  CHECK (type IN ('quiz', 'big_exam'));

-- Mark boundaries: mark_total > 0 and 0 <= mark_achieved <= mark_total
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_mark_achieved_check;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_mark_total_check;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS chk_grades_mark_bounds;
ALTER TABLE public.grades ADD CONSTRAINT chk_grades_mark_bounds 
  CHECK (mark_total > 0 AND mark_achieved >= 0 AND mark_achieved <= mark_total);

-- Weight percentage: 0 <= weight_pct <= 100
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_weight_pct_check;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS chk_grades_weight_pct;
ALTER TABLE public.grades ADD CONSTRAINT chk_grades_weight_pct 
  CHECK (weight_pct IS NULL OR (weight_pct >= 0 AND weight_pct <= 100));

-- 3. Ensure deadlines table exists and has proper columns and constraints
CREATE TABLE IF NOT EXISTS public.deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'exam',
  due_date timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Deadlines composite foreign key (subject_id, user_id)
ALTER TABLE public.deadlines DROP CONSTRAINT IF EXISTS deadlines_subject_id_fkey;
ALTER TABLE public.deadlines DROP CONSTRAINT IF EXISTS fk_deadlines_subject_user;
ALTER TABLE public.deadlines ADD CONSTRAINT fk_deadlines_subject_user 
  FOREIGN KEY (subject_id, user_id) 
  REFERENCES public.subjects(id, user_id) 
  ON DELETE CASCADE;

-- Deadline types: exam, quiz, assignment, project, reading
ALTER TABLE public.deadlines DROP CONSTRAINT IF EXISTS deadlines_type_check;
ALTER TABLE public.deadlines DROP CONSTRAINT IF EXISTS chk_deadlines_type;
ALTER TABLE public.deadlines ADD CONSTRAINT chk_deadlines_type 
  CHECK (type IN ('exam', 'quiz', 'assignment', 'project', 'reading'));

-- 4. Ensure mistakes table has composite foreign key for link integrity (Stage 8b readiness)
CREATE TABLE IF NOT EXISTS public.mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid NOT NULL,
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

ALTER TABLE public.mistakes DROP CONSTRAINT IF EXISTS mistakes_subject_id_fkey;
ALTER TABLE public.mistakes DROP CONSTRAINT IF EXISTS fk_mistakes_subject_user;
ALTER TABLE public.mistakes ADD CONSTRAINT fk_mistakes_subject_user 
  FOREIGN KEY (subject_id, user_id) 
  REFERENCES public.subjects(id, user_id) 
  ON DELETE CASCADE;

-- 5. Ensure focus_sessions has composite foreign key to subjects (Study link)
ALTER TABLE public.focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_subject_id_fkey;
ALTER TABLE public.focus_sessions DROP CONSTRAINT IF EXISTS fk_focus_sessions_subject_user;
ALTER TABLE public.focus_sessions ADD CONSTRAINT fk_focus_sessions_subject_user 
  FOREIGN KEY (subject_id, user_id) 
  REFERENCES public.subjects(id, user_id) 
  ON DELETE SET NULL;

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grades_user_subject ON public.grades (user_id, subject_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grades_entry_date ON public.grades (user_id, entry_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mistakes_user_subject ON public.mistakes (user_id, subject_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mistakes_resolved ON public.mistakes (user_id, resolved) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deadlines_user_due ON public.deadlines (user_id, due_date) WHERE deleted_at IS NULL;

-- 7. Enable Row Level Security
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- 8. Multi-Tenant RLS Policies (auth.uid() = user_id)
-- Subjects RLS
DROP POLICY IF EXISTS "Users can view own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON public.subjects;

CREATE POLICY "Users can view own subjects" ON public.subjects
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON public.subjects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON public.subjects
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON public.subjects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

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
