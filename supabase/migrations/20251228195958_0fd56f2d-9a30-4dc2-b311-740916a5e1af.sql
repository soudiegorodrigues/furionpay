-- Recriar a função get_platform_revenue_stats_custom_range com colunas corretas e estrutura esperada pelo frontend
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats_custom_range(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
  v_efi_rate NUMERIC;
  v_efi_fixed NUMERIC;
  v_gross_revenue NUMERIC;
  v_user_fees NUMERIC;
  v_pix_cost NUMERIC;
  v_withdrawal_cost NUMERIC;
  v_transaction_count INTEGER;
  v_daily_breakdown JSON;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue stats';
  END IF;

  -- Get acquirer rates from admin_settings
  SELECT 
    COALESCE(MAX(CASE WHEN key = 'inter_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'inter_fixed_fee' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fixed_fee' THEN value::NUMERIC END), 0.05),
    COALESCE(MAX(CASE WHEN key = 'valorion_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'valorion_fixed_fee' THEN value::NUMERIC END), 0.29),
    COALESCE(MAX(CASE WHEN key = 'efi_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'efi_fixed_fee' THEN value::NUMERIC END), 0.00)
  INTO v_inter_rate, v_inter_fixed, v_ativus_rate, v_ativus_fixed, v_valorion_rate, v_valorion_fixed, v_efi_rate, v_efi_fixed
  FROM admin_settings
  WHERE user_id IS NULL;

  -- Calculate gross revenue (volume total)
  SELECT COALESCE(SUM(amount), 0), COALESCE(COUNT(*), 0)
  INTO v_gross_revenue, v_transaction_count
  FROM pix_transactions
  WHERE status = 'paid'
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date;

  -- Calculate user fees (taxas cobradas dos usuários)
  SELECT COALESCE(SUM(
    CASE
      WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
        (amount * fee_percentage / 100) + fee_fixed
      ELSE
        (amount * 4.99 / 100) + 0.00
    END
  ), 0)
  INTO v_user_fees
  FROM pix_transactions
  WHERE status = 'paid'
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date;

  -- Calculate PIX cost (custo do adquirente)
  SELECT COALESCE(SUM(
    CASE acquirer
      WHEN 'inter' THEN ((v_inter_rate / 100) * amount) + v_inter_fixed
      WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount) + v_ativus_fixed
      WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount) + v_valorion_fixed
      WHEN 'efi' THEN ((v_efi_rate / 100) * amount) + v_efi_fixed
      ELSE 0
    END
  ), 0)
  INTO v_pix_cost
  FROM pix_transactions
  WHERE status = 'paid'
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date;

  -- Calculate withdrawal cost (usando gross_amount - amount como taxa real)
  SELECT COALESCE(SUM(
    CASE 
      WHEN gross_amount IS NOT NULL AND gross_amount > amount THEN gross_amount - amount
      ELSE COALESCE((amount * fee_percentage / 100), 0) + COALESCE(fee_fixed, 0)
    END
  ), 0)
  INTO v_withdrawal_cost
  FROM withdrawal_requests
  WHERE status = 'approved'
    AND (processed_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
    AND (processed_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date;

  -- Build daily breakdown
  SELECT COALESCE(json_agg(daily_data ORDER BY daily_data.date), '[]'::json)
  INTO v_daily_breakdown
  FROM (
    SELECT 
      (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE::TEXT as date,
      SUM(amount) as gross,
      SUM(
        CASE
          WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
            (amount * fee_percentage / 100) + fee_fixed
          ELSE
            (amount * 4.99 / 100) + 0.00
        END
      ) - SUM(
        CASE acquirer
          WHEN 'inter' THEN ((v_inter_rate / 100) * amount) + v_inter_fixed
          WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount) + v_ativus_fixed
          WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount) + v_valorion_fixed
          WHEN 'efi' THEN ((v_efi_rate / 100) * amount) + v_efi_fixed
          ELSE 0
        END
      ) as net,
      COUNT(*)::INTEGER as count
    FROM pix_transactions
    WHERE status = 'paid'
      AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
      AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date
    GROUP BY (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE
  ) daily_data;

  -- Build final result with structure expected by frontend
  SELECT json_build_object(
    'totals', json_build_object(
      'gross_revenue', v_gross_revenue,
      'user_fees', v_user_fees,
      'pix_cost', v_pix_cost,
      'withdrawal_cost', v_withdrawal_cost,
      'net_profit', v_user_fees - v_pix_cost - v_withdrawal_cost,
      'transaction_count', v_transaction_count
    ),
    'daily_breakdown', v_daily_breakdown
  ) INTO v_result;

  RETURN v_result;
END;
$$;