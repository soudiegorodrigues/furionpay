
-- Fix get_user_stats_by_period (JSON-returning) to match frontend expected keys
-- and align stats with the same date logic used by transaction listing (created_at-based).
CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(
  p_period text DEFAULT 'all'::text,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_effective_owner_id uuid;
  v_local_today date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'total_generated', 0,
      'total_paid', 0,
      'total_expired', 0,
      'total_amount_generated', 0,
      'total_amount_paid', 0,
      'total_fees', 0
    );
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());
  v_local_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

  -- If custom dates provided, use them
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSE
    CASE p_period
      WHEN 'today' THEN
        v_start_date := v_local_today::timestamptz;
        v_end_date := NOW();
      WHEN 'yesterday' THEN
        v_start_date := (v_local_today - 1)::timestamptz;
        v_end_date := v_local_today::timestamptz;
      WHEN '7days' THEN
        v_start_date := NOW() - INTERVAL '7 days';
        v_end_date := NOW();
      WHEN '15days' THEN
        v_start_date := NOW() - INTERVAL '15 days';
        v_end_date := NOW();
      WHEN '30days' THEN
        v_start_date := NOW() - INTERVAL '30 days';
        v_end_date := NOW();
      WHEN 'month' THEN
        v_start_date := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
        v_end_date := NOW();
      WHEN 'year' THEN
        v_start_date := date_trunc('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
        v_end_date := NOW();
      WHEN 'all' THEN
        v_start_date := '1970-01-01'::timestamptz;
        v_end_date := NOW();
      ELSE
        v_start_date := v_local_today::timestamptz;
        v_end_date := NOW();
    END CASE;
  END IF;

  -- Build stats aligned to created_at window
  SELECT json_build_object(
    'total_generated', COALESCE(COUNT(*), 0),
    'total_paid', COALESCE(COUNT(*) FILTER (WHERE status = 'paid'), 0),
    'total_expired', COALESCE(COUNT(*) FILTER (WHERE status = 'expired'), 0),
    'total_amount_generated', COALESCE(SUM(amount), 0),
    'total_amount_paid', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    'total_fees', COALESCE(SUM(
      CASE WHEN status = 'paid' THEN
        (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
      ELSE 0 END
    ), 0)
  )
  INTO v_result
  FROM public.pix_transactions
  WHERE user_id = v_effective_owner_id
    AND created_at >= v_start_date
    AND created_at < v_end_date;

  RETURN v_result;
END;
$function$;
