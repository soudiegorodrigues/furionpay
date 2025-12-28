-- Create function to get monthly revenue chart for the year (12 months)
CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart_monthly(
  p_user_email text DEFAULT NULL
)
RETURNS TABLE(month_name text, month_number int, lucro numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_year int := EXTRACT(YEAR FROM NOW());
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) AS month_num
  ),
  monthly_data AS (
    SELECT 
      EXTRACT(MONTH FROM paid_at)::int AS month_num,
      SUM(
        amount - 
        COALESCE(fee_fixed, 0) - 
        (amount * COALESCE(fee_percentage, 0) / 100)
      ) AS net_profit
    FROM pix_transactions
    WHERE status = 'paid'
      AND EXTRACT(YEAR FROM paid_at) = v_current_year
      AND (p_user_email IS NULL OR user_id IN (
        SELECT id FROM auth.users WHERE email = p_user_email
      ))
    GROUP BY EXTRACT(MONTH FROM paid_at)
  )
  SELECT 
    CASE m.month_num
      WHEN 1 THEN 'Jan'
      WHEN 2 THEN 'Fev'
      WHEN 3 THEN 'Mar'
      WHEN 4 THEN 'Abr'
      WHEN 5 THEN 'Mai'
      WHEN 6 THEN 'Jun'
      WHEN 7 THEN 'Jul'
      WHEN 8 THEN 'Ago'
      WHEN 9 THEN 'Set'
      WHEN 10 THEN 'Out'
      WHEN 11 THEN 'Nov'
      WHEN 12 THEN 'Dez'
    END AS month_name,
    m.month_num AS month_number,
    COALESCE(md.net_profit, 0)::numeric AS lucro
  FROM months m
  LEFT JOIN monthly_data md ON m.month_num = md.month_num
  ORDER BY m.month_num;
END;
$$;