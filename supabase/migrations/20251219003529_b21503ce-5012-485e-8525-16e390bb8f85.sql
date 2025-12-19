
-- Corrigir get_platform_user_profit_ranking para retornar campos consistentes
DROP FUNCTION IF EXISTS get_platform_user_profit_ranking(text, integer);

CREATE OR REPLACE FUNCTION public.get_platform_user_profit_ranking(
  p_filter text DEFAULT 'all',
  p_limit integer DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result JSON;
  start_date TIMESTAMPTZ;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Set date filter
  CASE p_filter
    WHEN 'today' THEN start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
    WHEN '7days' THEN start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '7 days';
    WHEN '30days' THEN start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '30 days';
    WHEN 'thisMonth' THEN start_date := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
    ELSE start_date := NULL;
  END CASE;

  SELECT JSON_AGG(ranking)
  INTO result
  FROM (
    SELECT 
      u.email as user_email,
      COUNT(pt.id) FILTER (WHERE pt.status = 'paid') as transaction_count,
      COALESCE(SUM(
        CASE WHEN pt.status = 'paid' THEN 
          (COALESCE(pt.fee_percentage, 0) / 100 * pt.amount) + COALESCE(pt.fee_fixed, 0)
        ELSE 0 END
      ), 0)::NUMERIC as total_profit
    FROM auth.users u
    LEFT JOIN pix_transactions pt ON pt.user_id = u.id 
      AND (start_date IS NULL OR pt.created_at >= start_date)
    GROUP BY u.id, u.email
    HAVING COUNT(pt.id) FILTER (WHERE pt.status = 'paid') > 0
    ORDER BY total_profit DESC
    LIMIT p_limit
  ) ranking;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;
