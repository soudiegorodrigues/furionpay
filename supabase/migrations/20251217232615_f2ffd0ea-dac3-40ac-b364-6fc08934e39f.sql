-- Fix collaborator visibility: all user-facing dashboard RPCs must use effective owner id

CREATE OR REPLACE FUNCTION public.get_user_settings()
RETURNS TABLE(key text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

  RETURN QUERY
  SELECT s.key, s.value
  FROM public.admin_settings s
  WHERE s.user_id = v_effective_owner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_dashboard_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_brazil_month_start DATE;
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

  -- Data atual no Brasil
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_brazil_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Buscar estatísticas agregadas (muito mais rápido!)
  SELECT json_build_object(
    'total_generated', COALESCE(SUM(generated_count), 0),
    'total_paid', COALESCE(SUM(paid_count), 0),
    'total_expired', COALESCE(SUM(expired_count), 0),
    'total_amount_generated', COALESCE(SUM(generated_amount), 0),
    'total_amount_paid', ROUND(COALESCE(SUM(paid_amount), 0) - COALESCE(SUM(total_fees), 0), 2),
    'today_generated', COALESCE(SUM(generated_count) FILTER (WHERE stat_date = v_brazil_today), 0),
    'today_paid', COALESCE(SUM(paid_count) FILTER (WHERE stat_date = v_brazil_today), 0),
    'today_amount_paid', ROUND(
      COALESCE(SUM(paid_amount) FILTER (WHERE stat_date = v_brazil_today), 0) -
      COALESCE(SUM(total_fees) FILTER (WHERE stat_date = v_brazil_today), 0),
      2
    ),
    'month_paid', COALESCE(SUM(paid_count) FILTER (WHERE stat_date >= v_brazil_month_start), 0),
    'month_amount_paid', ROUND(
      COALESCE(SUM(paid_amount) FILTER (WHERE stat_date >= v_brazil_month_start), 0) -
      COALESCE(SUM(total_fees) FILTER (WHERE stat_date >= v_brazil_month_start), 0),
      2
    ),
    'total_fees', ROUND(COALESCE(SUM(total_fees), 0), 2),
    'today_fees', ROUND(COALESCE(SUM(total_fees) FILTER (WHERE stat_date = v_brazil_today), 0), 2)
  ) INTO v_result
  FROM public.daily_user_stats
  WHERE user_id = v_effective_owner_id;

  -- Se não tem dados ainda, retornar zeros
  IF v_result IS NULL THEN
    v_result := json_build_object(
      'total_generated', 0,
      'total_paid', 0,
      'total_expired', 0,
      'total_amount_generated', 0,
      'total_amount_paid', 0,
      'today_generated', 0,
      'today_paid', 0,
      'today_amount_paid', 0,
      'month_paid', 0,
      'month_amount_paid', 0,
      'total_fees', 0,
      'today_fees', 0
    );
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_chart_data_by_day(p_days integer DEFAULT 7)
RETURNS TABLE(date_brazil text, gerados bigint, pagos bigint, valor_pago numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date DATE;
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());
  v_start_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE - (p_days - 1);

  RETURN QUERY
  SELECT
    stat_date::text as date_brazil,
    COALESCE(generated_count, 0)::bigint as gerados,
    COALESCE(paid_count, 0)::bigint as pagos,
    COALESCE(paid_amount, 0) as valor_pago
  FROM daily_user_stats
  WHERE user_id = v_effective_owner_id
    AND stat_date >= v_start_date
  ORDER BY stat_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_chart_data_by_hour(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(hour_brazil integer, gerados bigint, pagos bigint, valor_pago numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as hour_brazil,
    COUNT(*) FILTER (WHERE TRUE) as gerados,
    COUNT(*) FILTER (WHERE status = 'paid') as pagos,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as valor_pago
  FROM pix_transactions
  WHERE created_date_brazil = p_date
    AND user_id = v_effective_owner_id
  GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY hour_brazil;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_transactions(p_limit integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  amount numeric,
  status text,
  txid text,
  donor_name text,
  product_name text,
  created_at timestamp with time zone,
  paid_at timestamp with time zone,
  fee_percentage numeric,
  fee_fixed numeric,
  utm_data jsonb,
  popup_model text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

  -- Se p_limit for 0 ou NULL, usa limite alto (100000) para evitar limite default do Supabase de 1000
  IF p_limit IS NULL OR p_limit = 0 THEN
    RETURN QUERY
    SELECT t.id, t.amount, t.status::text, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at, t.fee_percentage, t.fee_fixed, t.utm_data, t.popup_model
    FROM public.pix_transactions t
    WHERE t.user_id = v_effective_owner_id
    ORDER BY t.created_at DESC
    LIMIT 100000;
  ELSE
    RETURN QUERY
    SELECT t.id, t.amount, t.status::text, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at, t.fee_percentage, t.fee_fixed, t.utm_data, t.popup_model
    FROM public.pix_transactions t
    WHERE t.user_id = v_effective_owner_id
    ORDER BY t.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_popup_model_stats()
RETURNS TABLE(popup_model text, total_generated bigint, total_paid bigint, conversion_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

  RETURN QUERY
  SELECT
    COALESCE(pt.popup_model, 'unknown') as popup_model,
    COUNT(*)::bigint as total_generated,
    COUNT(*) FILTER (WHERE pt.status = 'paid')::bigint as total_paid,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE pt.status = 'paid')::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM public.pix_transactions pt
  WHERE pt.user_id = v_effective_owner_id
  GROUP BY pt.popup_model;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_available_balance()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_paid NUMERIC;
  v_total_fees NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_approved_withdrawals NUMERIC;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

  -- Get user's specific fee config from admin_settings
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = v_effective_owner_id AND key = 'user_fee_config'
  LIMIT 1;

  -- Get fee config (user-specific or default)
  IF v_user_fee_config_id IS NOT NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_config
    FROM public.fee_configs
    WHERE id = v_user_fee_config_id
    LIMIT 1;
  END IF;

  -- Fallback to default fee config if user doesn't have one
  IF v_fee_config IS NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_config
    FROM public.fee_configs
    WHERE is_default = true
    LIMIT 1;
  END IF;

  -- Get total paid transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM pix_transactions
  WHERE user_id = v_effective_owner_id AND status = 'paid';

  -- Calculate total fees using stored fees first, then fallback to fee config
  SELECT COALESCE(
    SUM(
      CASE
        WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
          (amount * fee_percentage / 100) + fee_fixed
        WHEN v_fee_config IS NOT NULL THEN
          (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
        ELSE
          0
      END
    ), 0
  ) INTO v_total_fees
  FROM pix_transactions
  WHERE user_id = v_effective_owner_id AND status = 'paid';

  -- Get pending withdrawals - use gross_amount if available, otherwise calculate
  SELECT COALESCE(SUM(
    CASE
      WHEN gross_amount IS NOT NULL THEN gross_amount
      ELSE amount
    END
  ), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = v_effective_owner_id AND status = 'pending';

  -- Get approved withdrawals - use gross_amount if available
  SELECT COALESCE(SUM(
    CASE
      WHEN gross_amount IS NOT NULL THEN gross_amount
      ELSE amount
    END
  ), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = v_effective_owner_id AND status = 'approved';

  -- Available balance = Total paid - Fees - Pending withdrawals - Approved withdrawals
  -- Note: Rejected withdrawals are NOT subtracted, so full gross_amount returns to balance
  RETURN ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(p_period text DEFAULT 'all'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

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
  WHERE user_id = v_effective_owner_id AND key = 'user_fee_config'
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
      'total_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = v_effective_owner_id),
      'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = v_effective_owner_id AND status = 'paid'),
      'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = v_effective_owner_id AND status = 'expired'),
      'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = v_effective_owner_id), 0),
      'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = v_effective_owner_id AND status = 'paid'), 0),
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
        WHERE user_id = v_effective_owner_id AND status = 'paid'
      ), 0)
    ) INTO v_result;
  ELSE
    -- Period filtered stats
    SELECT json_build_object(
      'total_generated', (
        SELECT COUNT(*) FROM pix_transactions
        WHERE user_id = v_effective_owner_id
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ),
      'total_paid', (
        SELECT COUNT(*) FROM pix_transactions
        WHERE user_id = v_effective_owner_id AND status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ),
      'total_expired', (
        SELECT COUNT(*) FROM pix_transactions
        WHERE user_id = v_effective_owner_id AND status = 'expired'
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ),
      'total_amount_generated', COALESCE((
        SELECT SUM(amount) FROM pix_transactions
        WHERE user_id = v_effective_owner_id
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (created_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ), 0),
      'total_amount_paid', COALESCE((
        SELECT SUM(amount) FROM pix_transactions
        WHERE user_id = v_effective_owner_id AND status = 'paid'
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
        WHERE user_id = v_effective_owner_id AND status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo') < v_end_date
      ), 0)
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;