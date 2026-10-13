-- ==============================================================================
-- 009_school_and_academic_engine.sql
-- Stage 8a: School Engine, Subjects, Grades, Deadlines, Link Integrity
-- Idempotent Migration for Supabase SQL Editor
-- ==============================================================================

-- 1. DATA REMAPPING & CLEANUP (MANDATORY BEFORE TIGHTENING CONSTRAINTS)
-- Map legacy assessment types ('exam', 'midterm', 'final') to 'big_exam'
UPDATE public.grades 
SET type = 'big_exam' 
WHERE type IN ('exam', 'midterm', 'final');

-- Clean up any invalid mark_total or mark_achieved before adding check constraints
UPDATE public.grades 
SET mark_total = 100 
WHERE mark_total IS NULL OR mark_total <= 0;

UPDATE public.grades 
SET mark_achieved = mark_total 
WHERE mark_achieved > mark_total;

-- 2. SUBJECTS TABLE
-- Remove exam_date column if it exists (exam dates belong in deadlines)
ALTER TABLE public.subjects DROP COLUMN IF EXISTS exam_date;

-- Ensure lifecycle columns exist
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS target_grade numeric;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Bounds check on target_grade (0-100)
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS chk_subjects_target_grade;
ALTER TABLE public.subjects ADD CONSTRAINT chk_subjects_target_grade 
  CHECK (target_grade IS NULL OR (target_grade >= 0 AND target_grade <= 100));

-- Prohibit Volt Lime (#C6FF3D)
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS chk_subjects_color_no_lime;
ALTER TABLE public.subjects ADD CONSTRAINT chk_subjects_color_no_lime 
  CHECK (color IS NULL OR lower(trim(color)) != '#c6ff3d');

-- Composite unique constraint on (id, user_id) for link integrity foreign key targets
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS uq_subjects_id_user_id CASCADE;
ALTER TABLE public.subjects ADD CONSTRAINT uq_subjects_id_user_id UNIQUE (id, user_id);

-- Case-insensitive unique name per user among active (non-deleted) subjects
DROP INDEX IF EXISTS idx_subjects_user_name_unique;
CREATE UNIQUE INDEX idx_subjects_user_name_unique 
  ON public.subjects (user_id, lower(trim(name))) 
  WHERE deleted_at IS NULL;

-- 3. GRADES TABLE
-- Purge orphan rows that don't match an active subject(id, user_id) before adding FK
DELETE FROM public.grades 
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects s 
  WHERE s.id = grades.subject_id AND s.user_id = grades.user_id
);

-- Drop legacy simple foreign key and add composite FK
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_subject_id_fkey;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS fk_grades_subject_user;
ALTER TABLE public.grades ADD CONSTRAINT fk_grades_subject_user 
  FOREIGN KEY (subject_id, user_id) 
  REFERENCES public.subjects(id, user_id) 
  ON DELETE CASCADE;

-- Drop default CURRENT_DATE (dates must be passed from client timezone)
ALTER TABLE public.grades ALTER COLUMN entry_date DROP DEFAULT;

-- Grade types: strictly 'quiz' and 'big_exam'
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_type_check;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS chk_grades_type;
ALTER TABLE public.grades ADD CONSTRAINT chk_grades_type 
  CHECK (type IN ('quiz', 'big_exam'));

-- Mark bounds: mark_total > 0 and 0 <= mark_achieved <= mark_total
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_mark_achieved_check;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_mark_total_check;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS chk_grades_mark_bounds;
ALTER TABLE public.grades ADD CONSTRAINT chk_grades_mark_bounds 
  CHECK (mark_total > 0 AND mark_achieved >= 0 AND mark_achieved <= mark_total);

-- Weight percentage: 0 to 100
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_weight_pct_check;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS chk_grades_weight_pct;
ALTER TABLE public.grades ADD CONSTRAINT chk_grades_weight_pct 
  CHECK (weight_pct IS NULL OR (weight_pct >= 0 AND weight_pct <= 100));

-- 4. DEADLINES TABLE
-- Purge orphan deadlines that don't match an active subject(id, user_id) before adding FK
DELETE FROM public.deadlines 
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects s 
  WHERE s.id = deadlines.subject_id AND s.user_id = deadlines.user_id
);

-- Drop legacy simple foreign key and add composite FK
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

-- 5. FOCUS SESSIONS (STUDY LINK REUSE)
-- Set subject_id = NULL for any focus sessions pointing to nonexistent subjects
UPDATE public.focus_sessions 
SET subject_id = NULL 
WHERE subject_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.subjects s 
    WHERE s.id = focus_sessions.subject_id AND s.user_id = focus_sessions.user_id
  );

-- Composite FK on focus_sessions(subject_id, user_id)
ALTER TABLE public.focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_subject_id_fkey;
ALTER TABLE public.focus_sessions DROP CONSTRAINT IF EXISTS fk_focus_sessions_subject_user;
ALTER TABLE public.focus_sessions ADD CONSTRAINT fk_focus_sessions_subject_user 
  FOREIGN KEY (subject_id, user_id) 
  REFERENCES public.subjects(id, user_id) 
  ON DELETE SET NULL;

-- 6. MISTAKES TABLE (COMPOSITE LINK INTEGRITY FOR STAGE 8B READINESS)
DELETE FROM public.mistakes 
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects s 
  WHERE s.id = mistakes.subject_id AND s.user_id = mistakes.user_id
);

ALTER TABLE public.mistakes DROP CONSTRAINT IF EXISTS mistakes_subject_id_fkey;
ALTER TABLE public.mistakes DROP CONSTRAINT IF EXISTS fk_mistakes_subject_user;
ALTER TABLE public.mistakes ADD CONSTRAINT fk_mistakes_subject_user 
  FOREIGN KEY (subject_id, user_id) 
  REFERENCES public.subjects(id, user_id) 
  ON DELETE CASCADE;

-- 7. ENABLE RLS AND ENSURE POLICIES
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;

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
