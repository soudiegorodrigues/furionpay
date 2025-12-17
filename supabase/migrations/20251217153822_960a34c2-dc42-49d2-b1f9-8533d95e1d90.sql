-- Optimized ranking function using daily_user_stats table
CREATE OR REPLACE FUNCTION get_users_revenue_ranking_v2(
  p_limit integer DEFAULT 5,
  p_offset integer DEFAULT 0,
  p_date_filter text DEFAULT 'all'
)
RETURNS TABLE(
  user_id uuid,
  user_email text,
  total_generated bigint,
  total_paid bigint,
  total_amount_generated numeric,
  total_amount_paid numeric,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
BEGIN
  -- Calculate start date based on filter (using Brazil timezone)
  v_start_date := CASE p_date_filter
    WHEN 'today' THEN (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    WHEN '7days' THEN ((NOW() AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '6 days')::date
    WHEN 'month' THEN date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    WHEN 'year' THEN date_trunc('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    ELSE NULL
  END;
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text as user_email,
    COALESCE(SUM(d.generated_count), 0)::bigint as total_generated,
    COALESCE(SUM(d.paid_count), 0)::bigint as total_paid,
    COALESCE(SUM(d.generated_amount), 0)::numeric as total_amount_generated,
    COALESCE(SUM(d.paid_amount), 0)::numeric as total_amount_paid,
    CASE 
      WHEN COALESCE(SUM(d.generated_count), 0) > 0 THEN 
        ROUND((SUM(d.paid_count)::numeric / SUM(d.generated_count)::numeric) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM auth.users u
  LEFT JOIN daily_user_stats d ON d.user_id = u.id
    AND (v_start_date IS NULL OR d.stat_date >= v_start_date)
  GROUP BY u.id, u.email
  HAVING COALESCE(SUM(d.paid_count), 0) > 0
  ORDER BY COALESCE(SUM(d.paid_amount), 0) DESC, COALESCE(SUM(d.paid_count), 0) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;