
-- Drop the existing function first to allow modification
DROP FUNCTION IF EXISTS public.get_user_stats_by_period(text, date, date);

-- Fix get_user_stats_by_period to count paid transactions by paid_date_brazil
-- instead of created_date_brazil for accurate daily sales count
CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(p_period text, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  v_user_id uuid := auth.uid();
  v_effective_owner_id uuid;
  v_start_date date;
  v_end_date date;
BEGIN
  -- Get effective owner id (for collaborators)
  SELECT get_effective_owner_id(v_user_id) INTO v_effective_owner_id;

  -- Determine date range based on period or custom dates
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSE
    CASE p_period
      WHEN 'today' THEN
        v_start_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
        v_end_date := v_start_date;
      WHEN 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 day')::date;
        v_end_date := v_start_date;
      WHEN '7days' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo') - interval '6 days')::date;
        v_end_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
      WHEN '15days' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo') - interval '14 days')::date;
        v_end_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
      WHEN '30days' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo') - interval '29 days')::date;
        v_end_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
      WHEN 'month' THEN
        v_start_date := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))::date;
        v_end_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
      WHEN 'year' THEN
        v_start_date := date_trunc('year', (now() AT TIME ZONE 'America/Sao_Paulo'))::date;
        v_end_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
      ELSE
        v_start_date := NULL;
        v_end_date := NULL;
    END CASE;
  END IF;

  SELECT json_build_object(
    -- Count transactions CREATED in the period (for generated/pending)
    'total_generated', COUNT(*) FILTER (
      WHERE status = 'generated' 
        AND (v_start_date IS NULL OR created_date_brazil >= v_start_date)
        AND (v_end_date IS NULL OR created_date_brazil <= v_end_date)
    ),
    -- Count transactions PAID in the period (using paid_date_brazil)
    'total_paid', COUNT(*) FILTER (
      WHERE status = 'paid' 
        AND (v_start_date IS NULL OR paid_date_brazil >= v_start_date)
        AND (v_end_date IS NULL OR paid_date_brazil <= v_end_date)
    ),
    -- Count transactions EXPIRED in the period
    'total_expired', COUNT(*) FILTER (
      WHERE status = 'expired' 
        AND (v_start_date IS NULL OR created_date_brazil >= v_start_date)
        AND (v_end_date IS NULL OR created_date_brazil <= v_end_date)
    ),
    -- Amount generated (pending) in the period
    'total_amount_generated', COALESCE(SUM(amount) FILTER (
      WHERE status = 'generated'
        AND (v_start_date IS NULL OR created_date_brazil >= v_start_date)
        AND (v_end_date IS NULL OR created_date_brazil <= v_end_date)
    ), 0),
    -- Amount PAID in the period (using paid_date_brazil)
    'total_amount_paid', COALESCE(SUM(amount) FILTER (
      WHERE status = 'paid'
        AND (v_start_date IS NULL OR paid_date_brazil >= v_start_date)
        AND (v_end_date IS NULL OR paid_date_brazil <= v_end_date)
    ), 0),
    -- Fees for transactions PAID in the period
    'total_fees', COALESCE(SUM(
      CASE WHEN status = 'paid' 
        AND (v_start_date IS NULL OR paid_date_brazil >= v_start_date)
        AND (v_end_date IS NULL OR paid_date_brazil <= v_end_date)
      THEN
        (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
      ELSE 0 END
    ), 0)
  ) INTO result
  FROM pix_transactions
  WHERE user_id = v_effective_owner_id;

  RETURN result;
END;
$function$;
