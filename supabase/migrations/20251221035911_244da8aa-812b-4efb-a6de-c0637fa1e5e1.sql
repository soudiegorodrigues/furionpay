
-- Update get_user_stats_by_period to support custom date ranges
CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(
  p_period text DEFAULT 'all'::text,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_owner_id uuid;
  v_brazil_now TIMESTAMPTZ;
  v_brazil_today DATE;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_total_generated INTEGER := 0;
  v_total_paid INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_total_fees NUMERIC := 0;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Get effective owner_id (for collaborators)
  v_owner_id := get_effective_owner_id(v_user_id);
  
  -- Get current time in Brazil timezone
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_brazil_today := v_brazil_now::DATE;
  
  -- Calculate date range based on period
  CASE p_period
    WHEN 'today' THEN
      v_start_date := v_brazil_today::TIMESTAMPTZ;
      v_end_date := (v_brazil_today + INTERVAL '1 day')::TIMESTAMPTZ;
    WHEN 'yesterday' THEN
      v_start_date := (v_brazil_today - INTERVAL '1 day')::TIMESTAMPTZ;
      v_end_date := v_brazil_today::TIMESTAMPTZ;
    WHEN 'week' THEN
      v_start_date := (v_brazil_today - INTERVAL '7 days')::TIMESTAMPTZ;
      v_end_date := (v_brazil_today + INTERVAL '1 day')::TIMESTAMPTZ;
    WHEN 'month' THEN
      v_start_date := DATE_TRUNC('month', v_brazil_today)::TIMESTAMPTZ;
      v_end_date := (v_brazil_today + INTERVAL '1 day')::TIMESTAMPTZ;
    WHEN 'year' THEN
      v_start_date := DATE_TRUNC('year', v_brazil_today)::TIMESTAMPTZ;
      v_end_date := (v_brazil_today + INTERVAL '1 day')::TIMESTAMPTZ;
    WHEN 'custom' THEN
      -- Use provided dates for custom period
      v_start_date := COALESCE(p_start_date, v_brazil_today::TIMESTAMPTZ);
      v_end_date := COALESCE(p_end_date, (v_brazil_today + INTERVAL '1 day')::TIMESTAMPTZ);
    ELSE -- 'all'
      v_start_date := NULL;
      v_end_date := NULL;
  END CASE;
  
  -- Get statistics
  IF v_start_date IS NULL THEN
    -- All time stats
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'paid'),
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
      COALESCE(SUM(
        CASE WHEN status = 'paid' THEN
          (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
        ELSE 0 END
      ), 0)
    INTO v_total_generated, v_total_paid, v_total_amount, v_total_fees
    FROM pix_transactions
    WHERE user_id = v_owner_id;
  ELSE
    -- Period-specific stats
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'paid'),
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
      COALESCE(SUM(
        CASE WHEN status = 'paid' THEN
          (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
        ELSE 0 END
      ), 0)
    INTO v_total_generated, v_total_paid, v_total_amount, v_total_fees
    FROM pix_transactions
    WHERE user_id = v_owner_id
      AND created_at >= v_start_date
      AND created_at < v_end_date;
  END IF;
  
  RETURN json_build_object(
    'total_generated', v_total_generated,
    'total_paid', v_total_paid,
    'total_amount', v_total_amount,
    'total_fees', v_total_fees,
    'period', p_period,
    'start_date', v_start_date,
    'end_date', v_end_date
  );
END;
$$;
