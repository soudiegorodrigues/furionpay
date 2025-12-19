
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result JSON;
  today_start TIMESTAMPTZ;
  seven_days_ago TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
  year_start TIMESTAMPTZ;
  target_user_id UUID := NULL;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Set date boundaries
  today_start := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
  seven_days_ago := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '7 days';
  month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
  year_start := DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;

  -- Get user ID if email provided
  IF p_user_email IS NOT NULL THEN
    SELECT id INTO target_user_id FROM auth.users WHERE email = p_user_email;
  END IF;

  SELECT JSON_BUILD_OBJECT(
    'today', JSON_BUILD_OBJECT(
      'grossRevenue', COALESCE(SUM(CASE WHEN pt.created_at >= today_start AND pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
      'acquirerCost', COALESCE(SUM(CASE WHEN pt.created_at >= today_start AND pt.status = 'paid' THEN 
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0),
      'netProfit', COALESCE(SUM(CASE WHEN pt.created_at >= today_start AND pt.status = 'paid' THEN 
        (COALESCE(pt.fee_percentage, 0) / 100 * pt.amount) + COALESCE(pt.fee_fixed, 0) -
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0)
    ),
    'sevenDays', JSON_BUILD_OBJECT(
      'grossRevenue', COALESCE(SUM(CASE WHEN pt.created_at >= seven_days_ago AND pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
      'acquirerCost', COALESCE(SUM(CASE WHEN pt.created_at >= seven_days_ago AND pt.status = 'paid' THEN 
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0),
      'netProfit', COALESCE(SUM(CASE WHEN pt.created_at >= seven_days_ago AND pt.status = 'paid' THEN 
        (COALESCE(pt.fee_percentage, 0) / 100 * pt.amount) + COALESCE(pt.fee_fixed, 0) -
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0)
    ),
    'thisMonth', JSON_BUILD_OBJECT(
      'grossRevenue', COALESCE(SUM(CASE WHEN pt.created_at >= month_start AND pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
      'acquirerCost', COALESCE(SUM(CASE WHEN pt.created_at >= month_start AND pt.status = 'paid' THEN 
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0),
      'netProfit', COALESCE(SUM(CASE WHEN pt.created_at >= month_start AND pt.status = 'paid' THEN 
        (COALESCE(pt.fee_percentage, 0) / 100 * pt.amount) + COALESCE(pt.fee_fixed, 0) -
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0)
    ),
    'thisYear', JSON_BUILD_OBJECT(
      'grossRevenue', COALESCE(SUM(CASE WHEN pt.created_at >= year_start AND pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
      'acquirerCost', COALESCE(SUM(CASE WHEN pt.created_at >= year_start AND pt.status = 'paid' THEN 
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0),
      'netProfit', COALESCE(SUM(CASE WHEN pt.created_at >= year_start AND pt.status = 'paid' THEN 
        (COALESCE(pt.fee_percentage, 0) / 100 * pt.amount) + COALESCE(pt.fee_fixed, 0) -
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0)
    ),
    'total', JSON_BUILD_OBJECT(
      'grossRevenue', COALESCE(SUM(CASE WHEN pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
      'acquirerCost', COALESCE(SUM(CASE WHEN pt.status = 'paid' THEN 
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0),
      'netProfit', COALESCE(SUM(CASE WHEN pt.status = 'paid' THEN 
        (COALESCE(pt.fee_percentage, 0) / 100 * pt.amount) + COALESCE(pt.fee_fixed, 0) -
        CASE 
          WHEN pt.acquirer = 'valorion' THEN pt.amount * 0.0089
          WHEN pt.acquirer = 'ativus' THEN pt.amount * 0.0099
          ELSE pt.amount * 0.0149
        END ELSE 0 END), 0)
    ),
    'acquirerBreakdown', JSON_BUILD_OBJECT(
      'spedpay', JSON_BUILD_OBJECT(
        'today', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= today_start), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= today_start THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= today_start THEN pt.amount * 0.0149 ELSE 0 END), 0)
        ),
        'sevenDays', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago THEN pt.amount * 0.0149 ELSE 0 END), 0)
        ),
        'thisMonth', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= month_start), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= month_start THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'spedpay' AND pt.status = 'paid' AND pt.created_at >= month_start THEN pt.amount * 0.0149 ELSE 0 END), 0)
        ),
        'total', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'spedpay' AND pt.status = 'paid'), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'spedpay' AND pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'spedpay' AND pt.status = 'paid' THEN pt.amount * 0.0149 ELSE 0 END), 0)
        )
      ),
      'inter', JSON_BUILD_OBJECT(
        'today', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= today_start), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= today_start THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= today_start THEN pt.amount * 0.0149 ELSE 0 END), 0)
        ),
        'sevenDays', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago THEN pt.amount * 0.0149 ELSE 0 END), 0)
        ),
        'thisMonth', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= month_start), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= month_start THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'inter' AND pt.status = 'paid' AND pt.created_at >= month_start THEN pt.amount * 0.0149 ELSE 0 END), 0)
        ),
        'total', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'inter' AND pt.status = 'paid'), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'inter' AND pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'inter' AND pt.status = 'paid' THEN pt.amount * 0.0149 ELSE 0 END), 0)
        )
      ),
      'ativus', JSON_BUILD_OBJECT(
        'today', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= today_start), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= today_start THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= today_start THEN pt.amount * 0.0099 ELSE 0 END), 0)
        ),
        'sevenDays', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago THEN pt.amount * 0.0099 ELSE 0 END), 0)
        ),
        'thisMonth', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= month_start), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= month_start THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'ativus' AND pt.status = 'paid' AND pt.created_at >= month_start THEN pt.amount * 0.0099 ELSE 0 END), 0)
        ),
        'total', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'ativus' AND pt.status = 'paid'), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'ativus' AND pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'ativus' AND pt.status = 'paid' THEN pt.amount * 0.0099 ELSE 0 END), 0)
        )
      ),
      'valorion', JSON_BUILD_OBJECT(
        'today', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= today_start), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= today_start THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= today_start THEN pt.amount * 0.0089 ELSE 0 END), 0)
        ),
        'sevenDays', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= seven_days_ago THEN pt.amount * 0.0089 ELSE 0 END), 0)
        ),
        'thisMonth', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= month_start), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= month_start THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'valorion' AND pt.status = 'paid' AND pt.created_at >= month_start THEN pt.amount * 0.0089 ELSE 0 END), 0)
        ),
        'total', JSON_BUILD_OBJECT(
          'count', COALESCE(COUNT(*) FILTER (WHERE pt.acquirer = 'valorion' AND pt.status = 'paid'), 0),
          'volume', COALESCE(SUM(CASE WHEN pt.acquirer = 'valorion' AND pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
          'cost', COALESCE(SUM(CASE WHEN pt.acquirer = 'valorion' AND pt.status = 'paid' THEN pt.amount * 0.0089 ELSE 0 END), 0)
        )
      )
    )
  ) INTO result
  FROM pix_transactions pt
  WHERE (target_user_id IS NULL OR pt.user_id = target_user_id);

  RETURN result;
END;
$$;
