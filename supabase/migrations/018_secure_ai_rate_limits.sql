-- ==============================================================================
-- Migration 018: Secure AI Rate Limiting Function (Anti-Tamper & Concurrency Hardened)
--
-- Security enhancements:
-- 1. Drops the 4-argument check_ai_rate_limit(text, text, integer, integer).
--    Replaces with single-argument check_ai_rate_limit(p_route text).
-- 2. Function derives user_id solely from auth.uid() (never accepts caller user_id).
-- 3. Function derives date directly from profiles.timezone (handles invalid tz without crashing).
-- 4. Limits are hardcoded constants (15/min burst, 50/day cap) inside the function.
-- 5. Strict route allowlist ('nutrition_parse', 'nutrition/parse'). Unknown routes return 400.
-- 6. Solves first-request race condition via INSERT ... ON CONFLICT (user_id, route) DO NOTHING.
-- 7. SECURITY DEFINER with fixed search_path = public, auth, pg_temp.
-- 8. Executable only by authenticated role.
-- ==============================================================================

-- 1. Drop old 4-argument signature so callers cannot pass fake dates or custom limits
DROP FUNCTION IF EXISTS public.check_ai_rate_limit(text, text, integer, integer);

-- 2. Create single-argument hardened rate limiting function
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_route text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_route_key text;
  v_user_tz text;
  v_today text;
  v_rec record;
  v_new_min_count integer;
  v_new_min_window timestamptz;
  v_new_day_count integer;
  v_new_day_date text;

  c_max_per_minute CONSTANT integer := 15;
  c_max_per_day CONSTANT integer := 50;
BEGIN
  -- Strict caller verification: authenticated session required
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'status', 401, 'reason', 'Unauthorized: login required');
  END IF;

  -- Normalize & check route allowlist to prevent arbitrary row creation
  IF p_route IN ('nutrition_parse', 'nutrition/parse') THEN
    v_route_key := 'nutrition_parse';
  ELSE
    RETURN jsonb_build_object(
      'allowed', false,
      'status', 400,
      'reason', 'Invalid or unknown AI route name. Permitted routes: nutrition_parse'
    );
  END IF;

  -- Derive user timezone securely from profiles (fallback to UTC; handle invalid timezone strings)
  SELECT timezone INTO v_user_tz FROM public.profiles WHERE id = v_uid;
  IF v_user_tz IS NULL OR trim(v_user_tz) = '' THEN
    v_user_tz := 'UTC';
  END IF;

  BEGIN
    v_today := to_char(v_now AT TIME ZONE v_user_tz, 'YYYY-MM-DD');
  EXCEPTION WHEN OTHERS THEN
    v_today := to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  END;

  -- Ensure record exists with ON CONFLICT DO NOTHING (eliminates first-request concurrency race condition)
  INSERT INTO public.ai_rate_limits (
    user_id, route, minute_window, minute_count, daily_date, daily_count, created_at, updated_at
  ) VALUES (
    v_uid, v_route_key, v_now, 0, v_today, 0, v_now, v_now
  )
  ON CONFLICT (user_id, route) DO NOTHING;

  -- Lock row for update
  SELECT * INTO v_rec FROM public.ai_rate_limits
  WHERE user_id = v_uid AND route = v_route_key
  FOR UPDATE;

  -- 1. Check minute burst window (fixed 60-second block, not a sliding window):
  -- Note on window behavior: The minute rate limit uses a fixed 60-second block (resetting 60 seconds
  -- after minute_window was initialized), rather than a continuous rolling/sliding log. Requests
  -- concentrated directly at the boundary between two 60-second blocks can allow a brief burst across
  -- the boundary, which is an accepted design trade-off to keep counter increments atomic, O(1), and low-overhead.
  IF (EXTRACT(EPOCH FROM (v_now - v_rec.minute_window)) < 60) THEN
    IF v_rec.minute_count >= c_max_per_minute THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'status', 429,
        'reason', 'Burst rate limit exceeded: maximum ' || c_max_per_minute || ' requests per minute. Please wait a moment.'
      );
    END IF;
    v_new_min_count := v_rec.minute_count + 1;
    v_new_min_window := v_rec.minute_window;
  ELSE
    v_new_min_count := 1;
    v_new_min_window := v_now;
  END IF;

  -- 2. Check daily quota in user's timezone
  IF v_rec.daily_date = v_today THEN
    IF v_rec.daily_count >= c_max_per_day THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'status', 429,
        'reason', 'Daily AI food parsing quota of ' || c_max_per_day || ' requests reached for today. You can continue logging foods manually.'
      );
    END IF;
    v_new_day_count := v_rec.daily_count + 1;
    v_new_day_date := v_rec.daily_date;
  ELSE
    v_new_day_count := 1;
    v_new_day_date := v_today;
  END IF;

  -- Atomic update of persistent counters
  UPDATE public.ai_rate_limits
  SET minute_count = v_new_min_count,
      minute_window = v_new_min_window,
      daily_count = v_new_day_count,
      daily_date = v_new_day_date,
      updated_at = v_now
  WHERE user_id = v_uid AND route = v_route_key;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining_minute', c_max_per_minute - v_new_min_count,
    'remaining_daily', c_max_per_day - v_new_day_count
  );
END;
$$;

-- Restrict function execution: revoke from anon/public; grant only to authenticated users
REVOKE ALL ON FUNCTION public.check_ai_rate_limit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(text) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
