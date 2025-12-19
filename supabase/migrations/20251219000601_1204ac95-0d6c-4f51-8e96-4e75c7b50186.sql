
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  today_date DATE;
  week_start DATE;
  fortnight_start DATE;
  month_start DATE;
  last_month_start DATE;
  last_month_end DATE;
  year_start DATE;
BEGIN
  -- Define date ranges
  today_date := CURRENT_DATE;
  week_start := today_date - INTERVAL '6 days';
  fortnight_start := today_date - INTERVAL '14 days';
  month_start := DATE_TRUNC('month', today_date);
  last_month_start := DATE_TRUNC('month', today_date - INTERVAL '1 month');
  last_month_end := DATE_TRUNC('month', today_date) - INTERVAL '1 day';
  year_start := DATE_TRUNC('year', today_date);

  SELECT JSON_BUILD_OBJECT(
    'today', JSON_BUILD_OBJECT(
      'net_profit', COALESCE((
        SELECT SUM(
          CASE WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL 
          THEN (amount * fee_percentage / 100) + fee_fixed 
          ELSE 0 END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil = today_date
      ), 0),
      'gross_revenue', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil = today_date
      ), 0),
      'acquirer_cost', COALESCE((
        SELECT SUM(
          CASE 
            WHEN acquirer = 'spedpay' THEN amount * 0.0149
            WHEN acquirer = 'inter' THEN amount * 0.0099
            WHEN acquirer = 'ativus' THEN amount * 0.0129
            WHEN acquirer = 'valorion' THEN amount * 0.0119
            ELSE amount * 0.0149
          END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil = today_date
      ), 0)
    ),
    'week', JSON_BUILD_OBJECT(
      'net_profit', COALESCE((
        SELECT SUM(
          CASE WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL 
          THEN (amount * fee_percentage / 100) + fee_fixed 
          ELSE 0 END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= week_start
      ), 0),
      'gross_revenue', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= week_start
      ), 0),
      'acquirer_cost', COALESCE((
        SELECT SUM(
          CASE 
            WHEN acquirer = 'spedpay' THEN amount * 0.0149
            WHEN acquirer = 'inter' THEN amount * 0.0099
            WHEN acquirer = 'ativus' THEN amount * 0.0129
            WHEN acquirer = 'valorion' THEN amount * 0.0119
            ELSE amount * 0.0149
          END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= week_start
      ), 0)
    ),
    'fortnight', JSON_BUILD_OBJECT(
      'net_profit', COALESCE((
        SELECT SUM(
          CASE WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL 
          THEN (amount * fee_percentage / 100) + fee_fixed 
          ELSE 0 END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= fortnight_start
      ), 0),
      'gross_revenue', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= fortnight_start
      ), 0),
      'acquirer_cost', COALESCE((
        SELECT SUM(
          CASE 
            WHEN acquirer = 'spedpay' THEN amount * 0.0149
            WHEN acquirer = 'inter' THEN amount * 0.0099
            WHEN acquirer = 'ativus' THEN amount * 0.0129
            WHEN acquirer = 'valorion' THEN amount * 0.0119
            ELSE amount * 0.0149
          END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= fortnight_start
      ), 0)
    ),
    'month', JSON_BUILD_OBJECT(
      'net_profit', COALESCE((
        SELECT SUM(
          CASE WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL 
          THEN (amount * fee_percentage / 100) + fee_fixed 
          ELSE 0 END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= month_start
      ), 0),
      'gross_revenue', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= month_start
      ), 0),
      'acquirer_cost', COALESCE((
        SELECT SUM(
          CASE 
            WHEN acquirer = 'spedpay' THEN amount * 0.0149
            WHEN acquirer = 'inter' THEN amount * 0.0099
            WHEN acquirer = 'ativus' THEN amount * 0.0129
            WHEN acquirer = 'valorion' THEN amount * 0.0119
            ELSE amount * 0.0149
          END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= month_start
      ), 0)
    ),
    'last_month', JSON_BUILD_OBJECT(
      'net_profit', COALESCE((
        SELECT SUM(
          CASE WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL 
          THEN (amount * fee_percentage / 100) + fee_fixed 
          ELSE 0 END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= last_month_start AND paid_date_brazil <= last_month_end
      ), 0),
      'gross_revenue', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= last_month_start AND paid_date_brazil <= last_month_end
      ), 0),
      'acquirer_cost', COALESCE((
        SELECT SUM(
          CASE 
            WHEN acquirer = 'spedpay' THEN amount * 0.0149
            WHEN acquirer = 'inter' THEN amount * 0.0099
            WHEN acquirer = 'ativus' THEN amount * 0.0129
            WHEN acquirer = 'valorion' THEN amount * 0.0119
            ELSE amount * 0.0149
          END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= last_month_start AND paid_date_brazil <= last_month_end
      ), 0)
    ),
    'year', JSON_BUILD_OBJECT(
      'net_profit', COALESCE((
        SELECT SUM(
          CASE WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL 
          THEN (amount * fee_percentage / 100) + fee_fixed 
          ELSE 0 END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= year_start
      ), 0),
      'gross_revenue', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= year_start
      ), 0),
      'acquirer_cost', COALESCE((
        SELECT SUM(
          CASE 
            WHEN acquirer = 'spedpay' THEN amount * 0.0149
            WHEN acquirer = 'inter' THEN amount * 0.0099
            WHEN acquirer = 'ativus' THEN amount * 0.0129
            WHEN acquirer = 'valorion' THEN amount * 0.0119
            ELSE amount * 0.0149
          END
        )
        FROM pix_transactions 
        WHERE status = 'paid' AND paid_date_brazil >= year_start
      ), 0)
    ),
    'all_time', JSON_BUILD_OBJECT(
      'net_profit', COALESCE((
        SELECT SUM(
          CASE WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL 
          THEN (amount * fee_percentage / 100) + fee_fixed 
          ELSE 0 END
        )
        FROM pix_transactions 
        WHERE status = 'paid'
      ), 0),
      'gross_revenue', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE status = 'paid'
      ), 0),
      'acquirer_cost', COALESCE((
        SELECT SUM(
          CASE 
            WHEN acquirer = 'spedpay' THEN amount * 0.0149
            WHEN acquirer = 'inter' THEN amount * 0.0099
            WHEN acquirer = 'ativus' THEN amount * 0.0129
            WHEN acquirer = 'valorion' THEN amount * 0.0119
            ELSE amount * 0.0149
          END
        )
        FROM pix_transactions 
        WHERE status = 'paid'
      ), 0),
      'transaction_count', COALESCE((
        SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid'
      ), 0)
    ),
    'acquirer_breakdown', JSON_BUILD_OBJECT(
      'spedpay', JSON_BUILD_OBJECT(
        'today', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'spedpay'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'spedpay'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0149) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'spedpay'), 0)
        ),
        'sevenDays', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'spedpay'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'spedpay'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0149) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'spedpay'), 0)
        ),
        'thisMonth', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'spedpay'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'spedpay'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0149) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'spedpay'), 0)
        ),
        'total', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'spedpay'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'spedpay'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0149) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'spedpay'), 0)
        )
      ),
      'inter', JSON_BUILD_OBJECT(
        'today', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'inter'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'inter'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0099) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'inter'), 0)
        ),
        'sevenDays', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'inter'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'inter'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0099) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'inter'), 0)
        ),
        'thisMonth', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'inter'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'inter'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0099) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'inter'), 0)
        ),
        'total', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'inter'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'inter'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0099) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'inter'), 0)
        )
      ),
      'ativus', JSON_BUILD_OBJECT(
        'today', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'ativus'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'ativus'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0129) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'ativus'), 0)
        ),
        'sevenDays', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'ativus'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'ativus'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0129) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'ativus'), 0)
        ),
        'thisMonth', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'ativus'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'ativus'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0129) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'ativus'), 0)
        ),
        'total', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'ativus'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'ativus'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0129) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'ativus'), 0)
        )
      ),
      'valorion', JSON_BUILD_OBJECT(
        'today', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'valorion'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'valorion'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0119) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil = today_date AND acquirer = 'valorion'), 0)
        ),
        'sevenDays', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'valorion'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'valorion'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0119) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= week_start AND acquirer = 'valorion'), 0)
        ),
        'thisMonth', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'valorion'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'valorion'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0119) FROM pix_transactions WHERE status = 'paid' AND paid_date_brazil >= month_start AND acquirer = 'valorion'), 0)
        ),
        'total', JSON_BUILD_OBJECT(
          'count', COALESCE((SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'valorion'), 0),
          'volume', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'valorion'), 0),
          'cost', COALESCE((SELECT SUM(amount * 0.0119) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'valorion'), 0)
        )
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;
