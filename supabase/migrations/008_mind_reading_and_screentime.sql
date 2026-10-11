-- ==============================================================================
-- 008_mind_reading_and_screentime.sql
-- Stage 7c: Mind Reading Engine & Manual Screen Time Telemetry
-- Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Reading Books Catalog Table
CREATE TABLE IF NOT EXISTS public.reading_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  author text,
  total_pages integer CHECK (total_pages > 0),
  current_page integer DEFAULT 0 CHECK (current_page >= 0),
  status text NOT NULL DEFAULT 'reading' CHECK (status IN ('reading', 'completed', 'abandoned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Reading Daily Logs Table
CREATE TABLE IF NOT EXISTS public.reading_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.reading_books(id) ON DELETE SET NULL,
  logged_date date NOT NULL,
  pages_read integer NOT NULL CHECK (pages_read > 0),
  duration_minutes integer CHECK (duration_minutes > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 3. Screen Time Daily Logs Table (Manual Entry First)
CREATE TABLE IF NOT EXISTS public.screen_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date NOT NULL,
  total_minutes integer NOT NULL CHECK (total_minutes >= 0),
  productive_minutes integer DEFAULT 0 CHECK (productive_minutes >= 0),
  entertainment_minutes integer DEFAULT 0 CHECK (entertainment_minutes >= 0),
  pickups_count integer CHECK (pickups_count >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT screen_time_user_date_key UNIQUE (user_id, logged_date),
  CONSTRAINT screen_time_breakdown_check CHECK (productive_minutes + entertainment_minutes <= total_minutes)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.reading_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_time_logs ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies: auth.uid() = user_id
-- (No deleted_at in SELECT policy per architecture rules)

-- reading_books
DROP POLICY IF EXISTS "reading_books_select" ON public.reading_books;
CREATE POLICY "reading_books_select" ON public.reading_books FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reading_books_insert" ON public.reading_books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reading_books_update" ON public.reading_books FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reading_books_delete" ON public.reading_books FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- reading_logs
DROP POLICY IF EXISTS "reading_logs_select" ON public.reading_logs;
CREATE POLICY "reading_logs_select" ON public.reading_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reading_logs_insert" ON public.reading_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reading_logs_update" ON public.reading_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reading_logs_delete" ON public.reading_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- screen_time_logs
DROP POLICY IF EXISTS "screen_time_logs_select" ON public.screen_time_logs;
CREATE POLICY "screen_time_logs_select" ON public.screen_time_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "screen_time_logs_insert" ON public.screen_time_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "screen_time_logs_update" ON public.screen_time_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "screen_time_logs_delete" ON public.screen_time_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_reading_books_user ON public.reading_books(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reading_logs_user_date ON public.reading_logs(user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_reading_logs_book ON public.reading_logs(book_id);
CREATE INDEX IF NOT EXISTS idx_screen_time_user_date ON public.screen_time_logs(user_id, logged_date DESC);
