-- Fix get_user_stats_by_period to count paid transactions by paid_at instead of created_at
CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(
  p_period text DEFAULT 'today'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_owner_id uuid;
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_result json;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Get effective owner (for collaborators)
  v_owner_id := get_effective_owner_id(v_user_id);
  
  -- Calculate date range based on period (using Brazil timezone)
  v_end_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date + interval '1 day' - interval '1 second';
  v_end_date := v_end_date AT TIME ZONE 'America/Sao_Paulo';
  
  CASE p_period
    WHEN 'today' THEN
      v_start_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
      v_start_date := v_start_date AT TIME ZONE 'America/Sao_Paulo';
    WHEN 'yesterday' THEN
      v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '1 day');
      v_start_date := v_start_date AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '1 second';
      v_end_date := v_end_date AT TIME ZONE 'America/Sao_Paulo';
    WHEN '7days' THEN
      v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '6 days');
      v_start_date := v_start_date AT TIME ZONE 'America/Sao_Paulo';
    WHEN '30days' THEN
      v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '29 days');
      v_start_date := v_start_date AT TIME ZONE 'America/Sao_Paulo';
    WHEN 'thismonth' THEN
      v_start_date := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date);
      v_start_date := v_start_date AT TIME ZONE 'America/Sao_Paulo';
    WHEN 'lastmonth' THEN
      v_start_date := date_trunc('month', ((now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '1 month'));
      v_start_date := v_start_date AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date) - interval '1 second';
      v_end_date := v_end_date AT TIME ZONE 'America/Sao_Paulo';
    ELSE -- 'all' or any other value
      v_start_date := '1970-01-01'::timestamptz;
  END CASE;
  
  -- Build result with separate date filters for generated (created_at) and paid (paid_at)
  SELECT json_build_object(
    'total_generated', COALESCE((
      SELECT COUNT(*) 
      FROM pix_transactions 
      WHERE user_id = v_owner_id 
        AND created_at >= v_start_date 
        AND created_at <= v_end_date
    ), 0),
    'total_paid', COALESCE((
      SELECT COUNT(*) 
      FROM pix_transactions 
      WHERE user_id = v_owner_id 
        AND status = 'paid'
        AND paid_at >= v_start_date 
        AND paid_at <= v_end_date
    ), 0),
    'total_amount', COALESCE((
      SELECT SUM(amount) 
      FROM pix_transactions 
      WHERE user_id = v_owner_id 
        AND status = 'paid'
        AND paid_at >= v_start_date 
        AND paid_at <= v_end_date
    ), 0),
    'conversion_rate', CASE 
      WHEN COALESCE((
        SELECT COUNT(*) 
        FROM pix_transactions 
        WHERE user_id = v_owner_id 
          AND created_at >= v_start_date 
          AND created_at <= v_end_date
      ), 0) > 0 
      THEN ROUND(
        COALESCE((
          SELECT COUNT(*) 
          FROM pix_transactions 
          WHERE user_id = v_owner_id 
            AND status = 'paid'
            AND paid_at >= v_start_date 
            AND paid_at <= v_end_date
        ), 0)::numeric / 
        COALESCE((
          SELECT COUNT(*) 
          FROM pix_transactions 
          WHERE user_id = v_owner_id 
            AND created_at >= v_start_date 
            AND created_at <= v_end_date
        ), 1)::numeric * 100, 2
      )
      ELSE 0
    END,
    'period', p_period,
    'start_date', v_start_date,
    'end_date', v_end_date
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;