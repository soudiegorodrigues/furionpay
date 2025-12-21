-- Update get_user_stats_by_period to return total_fees instead of conversion_rate
DROP FUNCTION IF EXISTS public.get_user_stats_by_period(text, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(
  p_period text DEFAULT 'all'::text,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'total_generated', 0,
      'total_paid', 0,
      'total_expired', 0,
      'total_amount_generated', 0,
      'total_amount_paid', 0,
      'total_fees', 0
    );
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

  -- If custom dates provided, use them
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSE
    -- Calculate date range based on period
    CASE p_period
      WHEN 'today' THEN
        v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
        v_end_date := NOW();
      WHEN '7days' THEN
        v_start_date := NOW() - INTERVAL '7 days';
        v_end_date := NOW();
      WHEN '30days' THEN
        v_start_date := NOW() - INTERVAL '30 days';
        v_end_date := NOW();
      WHEN 'month' THEN
        v_start_date := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
        v_end_date := NOW();
      WHEN 'all' THEN
        v_start_date := '1970-01-01'::TIMESTAMPTZ;
        v_end_date := NOW();
      ELSE
        v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
        v_end_date := NOW();
    END CASE;
  END IF;

  SELECT json_build_object(
    'total_generated', (
      SELECT COUNT(*) FROM pix_transactions 
      WHERE user_id = v_effective_owner_id 
        AND created_at >= v_start_date 
        AND created_at <= v_end_date
    ),
    'total_paid', (
      SELECT COUNT(*) FROM pix_transactions 
      WHERE user_id = v_effective_owner_id 
        AND status = 'paid' 
        AND paid_at >= v_start_date 
        AND paid_at <= v_end_date
    ),
    'total_expired', (
      SELECT COUNT(*) FROM pix_transactions 
      WHERE user_id = v_effective_owner_id 
        AND status = 'expired' 
        AND created_at >= v_start_date 
        AND created_at <= v_end_date
    ),
    'total_amount_generated', COALESCE((
      SELECT SUM(amount) FROM pix_transactions 
      WHERE user_id = v_effective_owner_id 
        AND created_at >= v_start_date 
        AND created_at <= v_end_date
    ), 0),
    'total_amount_paid', COALESCE((
      SELECT SUM(amount) FROM pix_transactions 
      WHERE user_id = v_effective_owner_id 
        AND status = 'paid' 
        AND paid_at >= v_start_date 
        AND paid_at <= v_end_date
    ), 0),
    'total_fees', COALESCE((
      SELECT SUM(
        CASE 
          WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL 
          THEN amount * fee_percentage / 100 + fee_fixed
          ELSE 0
        END
      ) FROM pix_transactions 
      WHERE user_id = v_effective_owner_id 
        AND status = 'paid' 
        AND paid_at >= v_start_date 
        AND paid_at <= v_end_date
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;