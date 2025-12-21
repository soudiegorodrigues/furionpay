
-- Update the JSON-returning version of get_user_stats_by_period to include 'yesterday', '15days', and 'year' cases
CREATE OR REPLACE FUNCTION get_user_stats_by_period(
  p_period TEXT DEFAULT 'today',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'total_amount', 0,
      'paid_amount', 0,
      'paid_count', 0,
      'generated_count', 0,
      'expired_count', 0,
      'total_fees', 0
    );
  END IF;
  
  -- Determine date range based on period
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSE
    CASE p_period
      WHEN 'today' THEN
        v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
        v_end_date := NOW();
      WHEN 'yesterday' THEN
        v_start_date := ((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '1 day')::TIMESTAMPTZ;
        v_end_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
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
        v_start_date := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
        v_end_date := NOW();
      WHEN 'year' THEN
        v_start_date := date_trunc('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
        v_end_date := NOW();
      WHEN 'all' THEN
        v_start_date := '1970-01-01'::TIMESTAMPTZ;
        v_end_date := NOW();
      ELSE
        v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
        v_end_date := NOW();
    END CASE;
  END IF;
  
  SELECT json_build_object(
    'total_amount', COALESCE(SUM(amount), 0),
    'paid_amount', COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    'paid_count', COALESCE(COUNT(CASE WHEN status = 'paid' THEN 1 END), 0),
    'generated_count', COALESCE(COUNT(*), 0),
    'expired_count', COALESCE(COUNT(CASE WHEN status = 'expired' THEN 1 END), 0),
    'total_fees', COALESCE(SUM(
      CASE WHEN status = 'paid' THEN 
        (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
      ELSE 0 END
    ), 0)
  ) INTO v_result
  FROM pix_transactions
  WHERE user_id = v_user_id
    AND created_at >= v_start_date
    AND created_at < v_end_date;
  
  RETURN v_result;
END;
$$;
