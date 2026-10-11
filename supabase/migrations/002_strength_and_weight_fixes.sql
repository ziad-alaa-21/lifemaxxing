-- ==============================================================================
-- 002_strength_and_weight_fixes.sql
-- Run in Supabase SQL Editor to update strength_standards, profiles, and weight_logs
-- ==============================================================================

-- 1. Add current_weight_kg to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_weight_kg numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_weight_kg numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal_type text check (goal_type in ('cut', 'bulk', 'recomp'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm numeric;

-- 2. Create weight_logs table if missing with strict multi-tenant RLS & soft deletes
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight_kg numeric NOT NULL CHECK (weight_kg > 0),
  note text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS "Users can view own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can view own non-deleted weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can insert own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can update own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can delete own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can manage own weight logs" ON public.weight_logs;

-- Strict CRUD policies
CREATE POLICY "Users can view own weight logs" ON public.weight_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs" ON public.weight_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs" ON public.weight_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs" ON public.weight_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Replace seeded strength_standards with approved 7-tier standards
-- Drop legacy constraints from initial schema first
ALTER TABLE public.strength_standards DROP CONSTRAINT IF EXISTS strength_standards_tier_check;
ALTER TABLE public.strength_standards DROP CONSTRAINT IF EXISTS strength_standards_multiplier_check;

-- Clear old seeded standards BEFORE adding the new constraint so old rows don't trigger a check violation
DELETE FROM public.strength_standards;

-- Now add the approved 7-tier and multiplier constraints
ALTER TABLE public.strength_standards ADD CONSTRAINT strength_standards_tier_check 
  CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Olympian', 'Mr. Olympia'));

ALTER TABLE public.strength_standards ADD CONSTRAINT strength_standards_multiplier_check 
  CHECK (multiplier >= 0);

-- Also update user_rank_history constraint if it exists
ALTER TABLE public.user_rank_history DROP CONSTRAINT IF EXISTS user_rank_history_tier_check;
ALTER TABLE public.user_rank_history ADD CONSTRAINT user_rank_history_tier_check 
  CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Olympian', 'Mr. Olympia'));

-- MEN'S STANDARDS
-- Bench: 0.7, 1.0, 1.3, 1.6, 1.8, 2.0, 2.2
INSERT INTO public.strength_standards (exercise_id, gender, tier, multiplier) VALUES
('00000000-0000-0000-0000-000000000001', 'male', 'Bronze', 0.7),
('00000000-0000-0000-0000-000000000001', 'male', 'Silver', 1.0),
('00000000-0000-0000-0000-000000000001', 'male', 'Gold', 1.3),
('00000000-0000-0000-0000-000000000001', 'male', 'Platinum', 1.6),
('00000000-0000-0000-0000-000000000001', 'male', 'Diamond', 1.8),
('00000000-0000-0000-0000-000000000001', 'male', 'Olympian', 2.0),
('00000000-0000-0000-0000-000000000001', 'male', 'Mr. Olympia', 2.2),

-- Squat: 1.0, 1.3, 1.6, 2.0, 2.3, 2.6, 2.8
('00000000-0000-0000-0000-000000000002', 'male', 'Bronze', 1.0),
('00000000-0000-0000-0000-000000000002', 'male', 'Silver', 1.3),
('00000000-0000-0000-0000-000000000002', 'male', 'Gold', 1.6),
('00000000-0000-0000-0000-000000000002', 'male', 'Platinum', 2.0),
('00000000-0000-0000-0000-000000000002', 'male', 'Diamond', 2.3),
('00000000-0000-0000-0000-000000000002', 'male', 'Olympian', 2.6),
('00000000-0000-0000-0000-000000000002', 'male', 'Mr. Olympia', 2.8),

-- Deadlift: 1.2, 1.5, 1.9, 2.3, 2.6, 2.9, 3.1
('00000000-0000-0000-0000-000000000003', 'male', 'Bronze', 1.2),
('00000000-0000-0000-0000-000000000003', 'male', 'Silver', 1.5),
('00000000-0000-0000-0000-000000000003', 'male', 'Gold', 1.9),
('00000000-0000-0000-0000-000000000003', 'male', 'Platinum', 2.3),
('00000000-0000-0000-0000-000000000003', 'male', 'Diamond', 2.6),
('00000000-0000-0000-0000-000000000003', 'male', 'Olympian', 2.9),
('00000000-0000-0000-0000-000000000003', 'male', 'Mr. Olympia', 3.1),

-- OHP: 0.4, 0.6, 0.8, 1.0, 1.15, 1.3, 1.45
('00000000-0000-0000-0000-000000000004', 'male', 'Bronze', 0.4),
('00000000-0000-0000-0000-000000000004', 'male', 'Silver', 0.6),
('00000000-0000-0000-0000-000000000004', 'male', 'Gold', 0.8),
('00000000-0000-0000-0000-000000000004', 'male', 'Platinum', 1.0),
('00000000-0000-0000-0000-000000000004', 'male', 'Diamond', 1.15),
('00000000-0000-0000-0000-000000000004', 'male', 'Olympian', 1.3),
('00000000-0000-0000-0000-000000000004', 'male', 'Mr. Olympia', 1.45),

-- Pull-up: 0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85
('00000000-0000-0000-0000-000000000005', 'male', 'Bronze', 0.0),
('00000000-0000-0000-0000-000000000005', 'male', 'Silver', 0.1),
('00000000-0000-0000-0000-000000000005', 'male', 'Gold', 0.25),
('00000000-0000-0000-0000-000000000005', 'male', 'Platinum', 0.4),
('00000000-0000-0000-0000-000000000005', 'male', 'Diamond', 0.55),
('00000000-0000-0000-0000-000000000005', 'male', 'Olympian', 0.7),
('00000000-0000-0000-0000-000000000005', 'male', 'Mr. Olympia', 0.85),

-- Row: 0.6, 0.9, 1.2, 1.5, 1.7, 1.9, 2.1
('00000000-0000-0000-0000-000000000006', 'male', 'Bronze', 0.6),
('00000000-0000-0000-0000-000000000006', 'male', 'Silver', 0.9),
('00000000-0000-0000-0000-000000000006', 'male', 'Gold', 1.2),
('00000000-0000-0000-0000-000000000006', 'male', 'Platinum', 1.5),
('00000000-0000-0000-0000-000000000006', 'male', 'Diamond', 1.7),
('00000000-0000-0000-0000-000000000006', 'male', 'Olympian', 1.9),
('00000000-0000-0000-0000-000000000006', 'male', 'Mr. Olympia', 2.1);

-- WOMEN'S STANDARDS
-- Bench: 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.5
INSERT INTO public.strength_standards (exercise_id, gender, tier, multiplier) VALUES
('00000000-0000-0000-0000-000000000001', 'female', 'Bronze', 0.4),
('00000000-0000-0000-0000-000000000001', 'female', 'Silver', 0.6),
('00000000-0000-0000-0000-000000000001', 'female', 'Gold', 0.8),
('00000000-0000-0000-0000-000000000001', 'female', 'Platinum', 1.0),
('00000000-0000-0000-0000-000000000001', 'female', 'Diamond', 1.2),
('00000000-0000-0000-0000-000000000001', 'female', 'Olympian', 1.4),
('00000000-0000-0000-0000-000000000001', 'female', 'Mr. Olympia', 1.5),

-- Squat: 0.7, 0.9, 1.2, 1.5, 1.8, 2.0, 2.2
('00000000-0000-0000-0000-000000000002', 'female', 'Bronze', 0.7),
('00000000-0000-0000-0000-000000000002', 'female', 'Silver', 0.9),
('00000000-0000-0000-0000-000000000002', 'female', 'Gold', 1.2),
('00000000-0000-0000-0000-000000000002', 'female', 'Platinum', 1.5),
('00000000-0000-0000-0000-000000000002', 'female', 'Diamond', 1.8),
('00000000-0000-0000-0000-000000000002', 'female', 'Olympian', 2.0),
('00000000-0000-0000-0000-000000000002', 'female', 'Mr. Olympia', 2.2),

-- Deadlift: 0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.5
('00000000-0000-0000-0000-000000000003', 'female', 'Bronze', 0.8),
('00000000-0000-0000-0000-000000000003', 'female', 'Silver', 1.1),
('00000000-0000-0000-0000-000000000003', 'female', 'Gold', 1.4),
('00000000-0000-0000-0000-000000000003', 'female', 'Platinum', 1.7),
('00000000-0000-0000-0000-000000000003', 'female', 'Diamond', 2.0),
('00000000-0000-0000-0000-000000000003', 'female', 'Olympian', 2.3),
('00000000-0000-0000-0000-000000000003', 'female', 'Mr. Olympia', 2.5),

-- OHP: 0.3, 0.4, 0.55, 0.7, 0.85, 1.0, 1.1
('00000000-0000-0000-0000-000000000004', 'female', 'Bronze', 0.3),
('00000000-0000-0000-0000-000000000004', 'female', 'Silver', 0.4),
('00000000-0000-0000-0000-000000000004', 'female', 'Gold', 0.55),
('00000000-0000-0000-0000-000000000004', 'female', 'Platinum', 0.7),
('00000000-0000-0000-0000-000000000004', 'female', 'Diamond', 0.85),
('00000000-0000-0000-0000-000000000004', 'female', 'Olympian', 1.0),
('00000000-0000-0000-0000-000000000004', 'female', 'Mr. Olympia', 1.1),

-- Row: 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.5
('00000000-0000-0000-0000-000000000006', 'female', 'Bronze', 0.4),
('00000000-0000-0000-0000-000000000006', 'female', 'Silver', 0.6),
('00000000-0000-0000-0000-000000000006', 'female', 'Gold', 0.8),
('00000000-0000-0000-0000-000000000006', 'female', 'Platinum', 1.0),
('00000000-0000-0000-0000-000000000006', 'female', 'Diamond', 1.2),
('00000000-0000-0000-0000-000000000006', 'female', 'Olympian', 1.4),
('00000000-0000-0000-0000-000000000006', 'female', 'Mr. Olympia', 1.5);
