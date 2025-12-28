
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats_custom_range(p_start_date date, p_end_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue stats';
  END IF;

  -- Get acquirer rates from admin_settings (same as get_platform_revenue_stats)
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

  SELECT json_build_object(
    'total_fees_collected', COALESCE((
      SELECT SUM(
        CASE
          WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
            (amount * fee_percentage / 100) + fee_fixed
          ELSE
            (amount * 4.99 / 100) + 0.00
        END
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date
    ), 0),
    'total_pix_cost', COALESCE((
      SELECT SUM(
        CASE acquirer
          WHEN 'inter' THEN ((v_inter_rate / 100) * amount) + v_inter_fixed
          WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount) + v_ativus_fixed
          WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount) + v_valorion_fixed
          WHEN 'efi' THEN ((v_efi_rate / 100) * amount) + v_efi_fixed
          ELSE 0
        END
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date
    ), 0),
    'total_withdrawal_fees', COALESCE((
      SELECT SUM(fee_amount)
      FROM withdrawal_requests
      WHERE status = 'approved'
        AND (processed_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
        AND (processed_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date
    ), 0),
    'total_withdrawals_paid', COALESCE((
      SELECT SUM(amount)
      FROM withdrawal_requests
      WHERE status = 'approved'
        AND (processed_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
        AND (processed_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date
    ), 0),
    'period_start', p_start_date,
    'period_end', p_end_date
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
