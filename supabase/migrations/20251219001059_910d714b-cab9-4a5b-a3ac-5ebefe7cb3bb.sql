-- Drop all versions of the functions first
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats();
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(text);
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(text);
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart();

-- Recreate get_platform_revenue_stats with correct fee-based calculation
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH stats AS (
    SELECT
      -- Today stats - using platform fees
      COALESCE(SUM(CASE 
        WHEN paid_date_brazil = CURRENT_DATE AND status = 'paid' 
        THEN (COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0) 
        ELSE 0 
      END), 0) as today_gross_revenue,
      COALESCE(SUM(CASE 
        WHEN paid_date_brazil = CURRENT_DATE AND status = 'paid' 
        THEN CASE acquirer
          WHEN 'ativus' THEN 0.05
          WHEN 'valorion' THEN 0.01
          ELSE 0.02
        END
        ELSE 0 
      END), 0) as today_acquirer_cost,
      
      -- Week stats (7 days)
      COALESCE(SUM(CASE 
        WHEN paid_date_brazil >= CURRENT_DATE - INTERVAL '7 days' AND status = 'paid' 
        THEN (COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0) 
        ELSE 0 
      END), 0) as week_gross_revenue,
      COALESCE(SUM(CASE 
        WHEN paid_date_brazil >= CURRENT_DATE - INTERVAL '7 days' AND status = 'paid' 
        THEN CASE acquirer
          WHEN 'ativus' THEN 0.05
          WHEN 'valorion' THEN 0.01
          ELSE 0.02
        END
        ELSE 0 
      END), 0) as week_acquirer_cost,

      -- Fortnight stats (15 days)
      COALESCE(SUM(CASE 
        WHEN paid_date_brazil >= CURRENT_DATE - INTERVAL '15 days' AND status = 'paid' 
        THEN (COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0) 
        ELSE 0 
      END), 0) as fortnight_gross_revenue,
      COALESCE(SUM(CASE 
        WHEN paid_date_brazil >= CURRENT_DATE - INTERVAL '15 days' AND status = 'paid' 
        THEN CASE acquirer
          WHEN 'ativus' THEN 0.05
          WHEN 'valorion' THEN 0.01
          ELSE 0.02
        END
        ELSE 0 
      END), 0) as fortnight_acquirer_cost,
      
      -- Month stats
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', paid_date_brazil) = DATE_TRUNC('month', CURRENT_DATE) AND status = 'paid' 
        THEN (COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0) 
        ELSE 0 
      END), 0) as month_gross_revenue,
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', paid_date_brazil) = DATE_TRUNC('month', CURRENT_DATE) AND status = 'paid' 
        THEN CASE acquirer
          WHEN 'ativus' THEN 0.05
          WHEN 'valorion' THEN 0.01
          ELSE 0.02
        END
        ELSE 0 
      END), 0) as month_acquirer_cost,

      -- Last month stats
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', paid_date_brazil) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND status = 'paid' 
        THEN (COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0) 
        ELSE 0 
      END), 0) as last_month_gross_revenue,
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', paid_date_brazil) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND status = 'paid' 
        THEN CASE acquirer
          WHEN 'ativus' THEN 0.05
          WHEN 'valorion' THEN 0.01
          ELSE 0.02
        END
        ELSE 0 
      END), 0) as last_month_acquirer_cost,
      
      -- Year stats
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('year', paid_date_brazil) = DATE_TRUNC('year', CURRENT_DATE) AND status = 'paid' 
        THEN (COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0) 
        ELSE 0 
      END), 0) as year_gross_revenue,
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('year', paid_date_brazil) = DATE_TRUNC('year', CURRENT_DATE) AND status = 'paid' 
        THEN CASE acquirer
          WHEN 'ativus' THEN 0.05
          WHEN 'valorion' THEN 0.01
          ELSE 0.02
        END
        ELSE 0 
      END), 0) as year_acquirer_cost,

      -- All time stats
      COALESCE(SUM(CASE 
        WHEN status = 'paid' 
        THEN (COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0) 
        ELSE 0 
      END), 0) as all_time_gross_revenue,
      COALESCE(SUM(CASE 
        WHEN status = 'paid' 
        THEN CASE acquirer
          WHEN 'ativus' THEN 0.05
          WHEN 'valorion' THEN 0.01
          ELSE 0.02
        END
        ELSE 0 
      END), 0) as all_time_acquirer_cost
    FROM pix_transactions
  )
  SELECT jsonb_build_object(
    'today', jsonb_build_object(
      'gross_revenue', today_gross_revenue,
      'acquirer_cost', today_acquirer_cost,
      'net_profit', today_gross_revenue - today_acquirer_cost
    ),
    'week', jsonb_build_object(
      'gross_revenue', week_gross_revenue,
      'acquirer_cost', week_acquirer_cost,
      'net_profit', week_gross_revenue - week_acquirer_cost
    ),
    'fortnight', jsonb_build_object(
      'gross_revenue', fortnight_gross_revenue,
      'acquirer_cost', fortnight_acquirer_cost,
      'net_profit', fortnight_gross_revenue - fortnight_acquirer_cost
    ),
    'month', jsonb_build_object(
      'gross_revenue', month_gross_revenue,
      'acquirer_cost', month_acquirer_cost,
      'net_profit', month_gross_revenue - month_acquirer_cost
    ),
    'last_month', jsonb_build_object(
      'gross_revenue', last_month_gross_revenue,
      'acquirer_cost', last_month_acquirer_cost,
      'net_profit', last_month_gross_revenue - last_month_acquirer_cost
    ),
    'year', jsonb_build_object(
      'gross_revenue', year_gross_revenue,
      'acquirer_cost', year_acquirer_cost,
      'net_profit', year_gross_revenue - year_acquirer_cost
    ),
    'all_time', jsonb_build_object(
      'gross_revenue', all_time_gross_revenue,
      'acquirer_cost', all_time_acquirer_cost,
      'net_profit', all_time_gross_revenue - all_time_acquirer_cost
    )
  ) INTO result
  FROM stats;

  RETURN result;
END;
$$;

-- Recreate get_platform_revenue_chart with correct fee-based calculation
CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart(p_filter text DEFAULT '7d')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  start_date date;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Determine start date based on filter
  start_date := CASE p_filter
    WHEN '7d' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN '15d' THEN CURRENT_DATE - INTERVAL '15 days'
    WHEN '30d' THEN CURRENT_DATE - INTERVAL '30 days'
    WHEN '90d' THEN CURRENT_DATE - INTERVAL '90 days'
    ELSE CURRENT_DATE - INTERVAL '7 days'
  END;

  SELECT jsonb_agg(
    jsonb_build_object(
      'date', day_date,
      'profit', COALESCE(daily_profit, 0)
    ) ORDER BY day_date
  ) INTO result
  FROM (
    SELECT 
      d.day_date,
      SUM(
        CASE WHEN pt.status = 'paid' 
        THEN ((COALESCE(pt.fee_percentage, 0) / 100 * pt.amount) + COALESCE(pt.fee_fixed, 0)) 
             - CASE pt.acquirer
                 WHEN 'ativus' THEN 0.05
                 WHEN 'valorion' THEN 0.01
                 ELSE 0.02
               END
        ELSE 0 END
      ) as daily_profit
    FROM generate_series(start_date, CURRENT_DATE, '1 day'::interval) d(day_date)
    LEFT JOIN pix_transactions pt ON pt.paid_date_brazil = d.day_date::date
    GROUP BY d.day_date
  ) daily_stats;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;