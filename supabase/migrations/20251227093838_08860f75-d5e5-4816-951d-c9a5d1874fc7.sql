
-- Drop and recreate the get_user_stats_by_period function with status and platform filters
DROP FUNCTION IF EXISTS public.get_user_stats_by_period(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(
  p_period TEXT DEFAULT 'today',
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_status TEXT DEFAULT 'all',
  p_platform TEXT DEFAULT 'all'
)
RETURNS TABLE (
  total_generated BIGINT,
  total_paid BIGINT,
  total_expired BIGINT,
  generated_amount NUMERIC,
  paid_amount NUMERIC,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_timezone TEXT := 'America/Sao_Paulo';
BEGIN
  -- Calculate date range based on period
  IF p_period = 'custom' AND p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSIF p_period = 'today' THEN
    v_start_date := (NOW() AT TIME ZONE v_timezone)::DATE::TIMESTAMP AT TIME ZONE v_timezone;
    v_end_date := v_start_date + INTERVAL '1 day';
  ELSIF p_period = 'yesterday' THEN
    v_start_date := ((NOW() AT TIME ZONE v_timezone)::DATE - INTERVAL '1 day')::TIMESTAMP AT TIME ZONE v_timezone;
    v_end_date := (NOW() AT TIME ZONE v_timezone)::DATE::TIMESTAMP AT TIME ZONE v_timezone;
  ELSIF p_period = 'week' THEN
    v_start_date := ((NOW() AT TIME ZONE v_timezone)::DATE - INTERVAL '7 days')::TIMESTAMP AT TIME ZONE v_timezone;
    v_end_date := ((NOW() AT TIME ZONE v_timezone)::DATE + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE v_timezone;
  ELSIF p_period = 'month' THEN
    v_start_date := ((NOW() AT TIME ZONE v_timezone)::DATE - INTERVAL '30 days')::TIMESTAMP AT TIME ZONE v_timezone;
    v_end_date := ((NOW() AT TIME ZONE v_timezone)::DATE + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE v_timezone;
  ELSIF p_period = 'year' THEN
    v_start_date := ((NOW() AT TIME ZONE v_timezone)::DATE - INTERVAL '365 days')::TIMESTAMP AT TIME ZONE v_timezone;
    v_end_date := ((NOW() AT TIME ZONE v_timezone)::DATE + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE v_timezone;
  ELSIF p_period = 'all' THEN
    v_start_date := '1970-01-01'::TIMESTAMP AT TIME ZONE v_timezone;
    v_end_date := ((NOW() AT TIME ZONE v_timezone)::DATE + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE v_timezone;
  ELSE
    v_start_date := (NOW() AT TIME ZONE v_timezone)::DATE::TIMESTAMP AT TIME ZONE v_timezone;
    v_end_date := v_start_date + INTERVAL '1 day';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE t.status IN ('generated', 'paid', 'expired'))::BIGINT AS total_generated,
    COUNT(*) FILTER (WHERE t.status = 'paid')::BIGINT AS total_paid,
    COUNT(*) FILTER (WHERE t.status = 'expired')::BIGINT AS total_expired,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status IN ('generated', 'paid', 'expired')), 0)::NUMERIC AS generated_amount,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'paid'), 0)::NUMERIC AS paid_amount,
    CASE 
      WHEN COUNT(*) FILTER (WHERE t.status IN ('generated', 'paid', 'expired')) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE t.status = 'paid')::NUMERIC / COUNT(*) FILTER (WHERE t.status IN ('generated', 'paid', 'expired'))::NUMERIC) * 100, 2)
      ELSE 0
    END::NUMERIC AS conversion_rate
  FROM pix_transactions t
  WHERE t.user_id = auth.uid()
    AND t.created_at >= v_start_date
    AND t.created_at < v_end_date
    -- Status filter
    AND (
      p_status = 'all' 
      OR t.status = p_status::pix_status
    )
    -- Platform filter based on utm_source
    AND (
      p_platform = 'all'
      OR (
        p_platform = 'facebook' AND LOWER(t.utm_data->>'utm_source') IN ('facebook', 'fb', 'instagram', 'ig', 'meta')
      )
      OR (
        p_platform = 'google' AND LOWER(t.utm_data->>'utm_source') IN ('google', 'gads', 'youtube', 'yt')
      )
      OR (
        p_platform = 'tiktok' AND LOWER(t.utm_data->>'utm_source') IN ('tiktok', 'bytedance', 'tt')
      )
      OR (
        p_platform = 'other' AND t.utm_data->>'utm_source' IS NOT NULL 
        AND t.utm_data->>'utm_source' != ''
        AND LOWER(t.utm_data->>'utm_source') NOT IN ('facebook', 'fb', 'instagram', 'ig', 'meta', 'google', 'gads', 'youtube', 'yt', 'tiktok', 'bytedance', 'tt')
      )
    );
END;
$$;
