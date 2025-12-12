-- Create function to get available balance for any user (admin only)
CREATE OR REPLACE FUNCTION public.get_user_available_balance_admin(p_user_id uuid)
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
  v_fee_config_id TEXT;
  v_fee_percentage NUMERIC;
  v_fee_fixed NUMERIC;
BEGIN
  -- Only admins can use this function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view other users balances';
  END IF;

  -- Get user's fee config or default
  SELECT value INTO v_fee_config_id
  FROM public.admin_settings
  WHERE user_id = p_user_id AND key = 'user_fee_config';

  -- Get fee values
  IF v_fee_config_id IS NOT NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
    FROM public.fee_configs
    WHERE id = v_fee_config_id::uuid;
  END IF;

  -- If no specific config, get default
  IF v_fee_percentage IS NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
    FROM public.fee_configs
    WHERE is_default = true
    LIMIT 1;
  END IF;

  -- Default to 0 if no config found
  v_fee_percentage := COALESCE(v_fee_percentage, 0);
  v_fee_fixed := COALESCE(v_fee_fixed, 0);

  -- Get total paid transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM pix_transactions
  WHERE user_id = p_user_id AND status = 'paid';

  -- Calculate total fees using stored fees when available, otherwise use configured fees
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN pt.fee_percentage IS NOT NULL AND pt.fee_fixed IS NOT NULL 
        THEN (pt.amount * pt.fee_percentage / 100) + pt.fee_fixed
        ELSE (pt.amount * v_fee_percentage / 100) + v_fee_fixed
      END
    ), 0
  ) INTO v_total_fees
  FROM pix_transactions pt
  WHERE pt.user_id = p_user_id AND pt.status = 'paid';

  -- Get pending withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'pending';

  -- Get approved withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'approved';

  -- Available balance = Total paid - Fees - Pending withdrawals - Approved withdrawals
  RETURN ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals, 2);
END;
$$;