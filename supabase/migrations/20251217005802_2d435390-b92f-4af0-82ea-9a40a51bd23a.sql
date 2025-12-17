-- Função RPC para obter estatísticas do usuário por período
-- Retorna contagens e somas sem carregar registros individuais
CREATE OR REPLACE FUNCTION get_user_stats_by_period(p_period text DEFAULT 'all')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current date in Brazil timezone
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_end_date := NOW();
  
  -- Calculate start date based on period
  CASE p_period
    WHEN 'today' THEN
      v_start_date := v_brazil_today::TIMESTAMPTZ;
    WHEN 'yesterday' THEN
      v_start_date := (v_brazil_today - INTERVAL '1 day')::TIMESTAMPTZ;
      v_end_date := v_brazil_today::TIMESTAMPTZ;
    WHEN '7days' THEN
      v_start_date := (v_brazil_today - INTERVAL '7 days')::TIMESTAMPTZ;
    WHEN '15days' THEN
      v_start_date := (v_brazil_today - INTERVAL '15 days')::TIMESTAMPTZ;
    WHEN 'month' THEN
      v_start_date := DATE_TRUNC('month', v_brazil_today)::TIMESTAMPTZ;
    WHEN 'year' THEN
      v_start_date := DATE_TRUNC('year', v_brazil_today)::TIMESTAMPTZ;
    ELSE -- 'all'
      v_start_date := NULL;
  END CASE;
  
  -- Get user's fee config
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = auth.uid() AND key = 'user_fee_config'
  LIMIT 1;

  IF v_user_fee_config_id IS NOT NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_config
    FROM public.fee_configs
    WHERE id = v_user_fee_config_id
    LIMIT 1;
  END IF;

  IF v_fee_config IS NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_config
    FROM public.fee_configs
    WHERE is_default = true
    LIMIT 1;
  END IF;
  
  -- Build result based on period filter
  IF v_start_date IS NULL THEN
    -- All time stats
    SELECT json_build_object(
      'total_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid()),
      'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'),
      'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'expired'),
      'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid()), 0),
      'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'), 0),
      'total_fees', COALESCE((
        SELECT SUM(
          CASE 
            WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
              (amount * fee_percentage / 100) + fee_fixed
            WHEN v_fee_config IS NOT NULL THEN
              (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
            ELSE 0
          END
        )
        FROM pix_transactions
        WHERE user_id = auth.uid() AND status = 'paid'
      ), 0)
    ) INTO v_result;
  ELSE
    -- Period filtered stats
    SELECT json_build_object(
      'total_generated', (
        SELECT COUNT(*) FROM pix_transactions 
        WHERE user_id = auth.uid() 
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ),
      'total_paid', (
        SELECT COUNT(*) FROM pix_transactions 
        WHERE user_id = auth.uid() AND status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ),
      'total_expired', (
        SELECT COUNT(*) FROM pix_transactions 
        WHERE user_id = auth.uid() AND status = 'expired'
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ),
      'total_amount_generated', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE user_id = auth.uid()
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ), 0),
      'total_amount_paid', COALESCE((
        SELECT SUM(amount) FROM pix_transactions 
        WHERE user_id = auth.uid() AND status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ), 0),
      'total_fees', COALESCE((
        SELECT SUM(
          CASE 
            WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
              (amount * fee_percentage / 100) + fee_fixed
            WHEN v_fee_config IS NOT NULL THEN
              (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
            ELSE 0
          END
        )
        FROM pix_transactions
        WHERE user_id = auth.uid() AND status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ), 0)
    ) INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;