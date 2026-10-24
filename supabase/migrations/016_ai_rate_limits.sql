-- ==============================================================================
-- Migration 016: Persistent Shared Rate Limits & Daily Quota Tracking
-- Enables abuse protection across Vercel serverless instances and cold starts.
-- Tracks burst limit (15/min) and daily cap (50/day) in the user's timezone.
--
-- Security hardening:
-- 1. check_ai_rate_limit uses auth.uid() exclusively (never accepts user_id from caller).
-- 2. Function is SECURITY DEFINER with fixed search_path = public, auth, pg_temp.
-- 3. Function execution is revoked from anon/public; granted strictly to authenticated.
-- 4. ai_rate_limits table has RLS enabled with NO INSERT/UPDATE/DELETE policies for users.
--    Direct writes by authenticated or anon callers are blocked; only SECURITY DEFINER can mutate.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  route text NOT NULL,
  minute_window timestamptz NOT NULL DEFAULT now(),
  minute_count integer NOT NULL DEFAULT 1,
  daily_date text NOT NULL, -- User's local date (YYYY-MM-DD)
  daily_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, route)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users may only view their own quota counters (read-only)
DROP POLICY IF EXISTS "Users can read own rate limits" ON public.ai_rate_limits;
CREATE POLICY "Users can read own rate limits"
  ON public.ai_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Explicitly ensure NO direct write policies exist for users
DROP POLICY IF EXISTS "Users can insert own rate limits" ON public.ai_rate_limits;
DROP POLICY IF EXISTS "Users can update own rate limits" ON public.ai_rate_limits;
DROP POLICY IF EXISTS "Users can delete own rate limits" ON public.ai_rate_limits;

-- Revoke all direct write privileges from anon and authenticated roles
REVOKE INSERT, UPDATE, DELETE ON public.ai_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_rate_limits TO authenticated;

-- Atomic function to check and increment rate limit in a single transaction
-- Uses auth.uid() internally. NEVER accepts a user_id parameter from caller.
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_route text,
  p_user_date text,
  p_max_per_minute integer DEFAULT 15,
  p_max_per_day integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_rec record;
  v_new_min_count integer;
  v_new_min_window timestamptz;
  v_new_day_count integer;
  v_new_day_date text;
BEGIN
  -- Strict caller verification: authenticated session required
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'status', 401, 'reason', 'Unauthorized: login required');
  END IF;

  -- Lock row for update to eliminate race conditions between concurrent serverless invocations
  SELECT * INTO v_rec FROM public.ai_rate_limits
  WHERE user_id = v_uid AND route = p_route
  FOR UPDATE;

  -- First request for this route by this user
  IF NOT FOUND THEN
    INSERT INTO public.ai_rate_limits (
      user_id, route, minute_window, minute_count, daily_date, daily_count, updated_at
    ) VALUES (
      v_uid, p_route, v_now, 1, p_user_date, 1, v_now
    );
    RETURN jsonb_build_object('allowed', true, 'remaining_minute', p_max_per_minute - 1, 'remaining_daily', p_max_per_day - 1);
  END IF;

  -- 1. Check minute burst window (60-second sliding block)
  IF (EXTRACT(EPOCH FROM (v_now - v_rec.minute_window)) < 60) THEN
    IF v_rec.minute_count >= p_max_per_minute THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'status', 429,
        'reason', 'Burst rate limit exceeded: maximum ' || p_max_per_minute || ' requests per minute. Please wait a moment.'
      );
    END IF;
    v_new_min_count := v_rec.minute_count + 1;
    v_new_min_window := v_rec.minute_window;
  ELSE
    v_new_min_count := 1;
    v_new_min_window := v_now;
  END IF;

  -- 2. Check daily quota (per user's local date YYYY-MM-DD)
  IF v_rec.daily_date = p_user_date THEN
    IF v_rec.daily_count >= p_max_per_day THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'status', 429,
        'reason', 'Daily AI food parsing quota of ' || p_max_per_day || ' requests reached for today. You can continue logging foods manually.'
      );
    END IF;
    v_new_day_count := v_rec.daily_count + 1;
    v_new_day_date := v_rec.daily_date;
  ELSE
    v_new_day_count := 1;
    v_new_day_date := p_user_date;
  END IF;

  -- Atomic update of persistent counters
  UPDATE public.ai_rate_limits
  SET minute_count = v_new_min_count,
      minute_window = v_new_min_window,
      daily_count = v_new_day_count,
      daily_date = v_new_day_date,
      updated_at = v_now
  WHERE user_id = v_uid AND route = p_route;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining_minute', p_max_per_minute - v_new_min_count,
    'remaining_daily', p_max_per_day - v_new_day_count
  );
END;
$$;

-- Restrict function execution: revoke from anon/public; grant only to authenticated users
REVOKE ALL ON FUNCTION public.check_ai_rate_limit(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(text, text, integer, integer) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
