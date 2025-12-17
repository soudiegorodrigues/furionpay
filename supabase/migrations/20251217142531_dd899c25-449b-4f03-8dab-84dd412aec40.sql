
-- Drop and recreate the function to include transaction_count in all_time
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  user_filter_id uuid;
  brazil_now timestamp with time zone;
  brazil_today date;
BEGIN
  -- Get Brazil timezone current time
  brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  brazil_today := brazil_now::date;
  
  -- Get user_id if email filter provided
  IF p_user_email IS NOT NULL THEN
    SELECT id INTO user_filter_id
    FROM auth.users
    WHERE email = p_user_email;
  END IF;
  
  SELECT json_build_object(
    'today', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', 0,
        'net_profit', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date = brazil_today
        AND (user_filter_id IS NULL OR user_id = user_filter_id)
    ),
    'week', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', 0,
        'net_profit', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date >= brazil_today - INTERVAL '6 days'
        AND (user_filter_id IS NULL OR user_id = user_filter_id)
    ),
    'fortnight', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', 0,
        'net_profit', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date >= brazil_today - INTERVAL '14 days'
        AND (user_filter_id IS NULL OR user_id = user_filter_id)
    ),
    'month', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', 0,
        'net_profit', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND EXTRACT(MONTH FROM (paid_at AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(MONTH FROM brazil_now)
        AND EXTRACT(YEAR FROM (paid_at AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(YEAR FROM brazil_now)
        AND (user_filter_id IS NULL OR user_id = user_filter_id)
    ),
    'year', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', 0,
        'net_profit', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND EXTRACT(YEAR FROM (paid_at AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(YEAR FROM brazil_now)
        AND (user_filter_id IS NULL OR user_id = user_filter_id)
    ),
    'all_time', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', 0,
        'net_profit', COALESCE(SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND (user_filter_id IS NULL OR user_id = user_filter_id)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
