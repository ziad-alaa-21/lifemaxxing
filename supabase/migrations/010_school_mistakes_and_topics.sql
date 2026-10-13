-- ==============================================================================
-- 010_school_mistakes_and_topics.sql
-- Stage 8b-1: Mistakes Notebook & Topic Spaced Repetition Mastery
-- Idempotent Migration for Supabase SQL Editor
-- ==============================================================================

-- 1. ACADEMIC TOPICS ENHANCEMENTS
-- Add current_interval_days to support Leitner interval retention on neutral rating 3
ALTER TABLE public.academic_topics 
  ADD COLUMN IF NOT EXISTS current_interval_days integer NOT NULL DEFAULT 1;

-- Ensure next_review_at is nullable for unscheduled / unstarted topics
ALTER TABLE public.academic_topics 
  ALTER COLUMN next_review_at DROP NOT NULL;

-- 2. PARTIAL PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_academic_topics_next_review 
  ON public.academic_topics (user_id, next_review_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mistakes_redo_at 
  ON public.mistakes (user_id, redo_at) 
  WHERE resolved = false AND deleted_at IS NULL;
