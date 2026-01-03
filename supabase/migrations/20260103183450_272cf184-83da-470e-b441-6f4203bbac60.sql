-- Update the balance function to also deduct confirmed chargebacks
CREATE OR REPLACE FUNCTION public.get_user_available_balance()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_paid NUMERIC;
  v_total_fees NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_approved_withdrawals NUMERIC;
  v_confirmed_chargebacks NUMERIC;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  -- Get user's specific fee config from admin_settings
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = auth.uid() AND key = 'user_fee_config'
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
  WHERE user_id = auth.uid() AND status = 'paid';

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
  WHERE user_id = auth.uid() AND status = 'paid';

  -- Get pending withdrawals - use gross_amount if available, otherwise calculate
  SELECT COALESCE(SUM(
    CASE 
      WHEN gross_amount IS NOT NULL THEN gross_amount
      ELSE amount
    END
  ), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'pending';

  -- Get approved withdrawals - use gross_amount if available
  SELECT COALESCE(SUM(
    CASE 
      WHEN gross_amount IS NOT NULL THEN gross_amount
      ELSE amount
    END
  ), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'approved';

  -- Get confirmed chargebacks (NEW: deduct confirmed chargebacks from balance)
  SELECT COALESCE(SUM(amount), 0) INTO v_confirmed_chargebacks
  FROM chargebacks
  WHERE user_id = auth.uid() AND status = 'confirmed';

  -- Available balance = Total paid - Fees - Pending withdrawals - Approved withdrawals - Confirmed Chargebacks
  RETURN ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals - v_confirmed_chargebacks, 2);
END;
$function$;

-- Also update the admin version
CREATE OR REPLACE FUNCTION public.get_user_available_balance_admin(p_user_id UUID)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_paid NUMERIC;
  v_total_fees NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_approved_withdrawals NUMERIC;
  v_confirmed_chargebacks NUMERIC;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
BEGIN
  -- Only admins can use this function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view other users balances';
  END IF;

  -- Get user's specific fee config from admin_settings
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = p_user_id AND key = 'user_fee_config'
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
  WHERE user_id = p_user_id AND status = 'paid';

  -- Calculate total fees
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
  WHERE user_id = p_user_id AND status = 'paid';

  -- Get pending withdrawals
  SELECT COALESCE(SUM(
    CASE 
      WHEN gross_amount IS NOT NULL THEN gross_amount
      ELSE amount
    END
  ), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'pending';

  -- Get approved withdrawals
  SELECT COALESCE(SUM(
    CASE 
      WHEN gross_amount IS NOT NULL THEN gross_amount
      ELSE amount
    END
  ), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'approved';

  -- Get confirmed chargebacks (NEW)
  SELECT COALESCE(SUM(amount), 0) INTO v_confirmed_chargebacks
  FROM chargebacks
  WHERE user_id = p_user_id AND status = 'confirmed';

  -- Available balance = Total paid - Fees - Pending - Approved - Chargebacks
  RETURN ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals - v_confirmed_chargebacks, 2);
END;
$function$;

-- Also update the balance details function
CREATE OR REPLACE FUNCTION public.get_user_balance_details()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_paid NUMERIC;
  v_total_fees NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_approved_withdrawals NUMERIC;
  v_confirmed_chargebacks NUMERIC;
  v_transaction_count INTEGER;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'total_paid', 0,
      'total_fees', 0,
      'net_balance', 0,
      'pending_withdrawals', 0,
      'approved_withdrawals', 0,
      'confirmed_chargebacks', 0,
      'available_balance', 0,
      'transaction_count', 0
    );
  END IF;

  -- Get user's specific fee config
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

  SELECT COALESCE(SUM(amount), 0), COUNT(*) INTO v_total_paid, v_transaction_count
  FROM pix_transactions
  WHERE user_id = auth.uid() AND status = 'paid';

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
  WHERE user_id = auth.uid() AND status = 'paid';

  SELECT COALESCE(SUM(
    CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
  ), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'pending';

  SELECT COALESCE(SUM(
    CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
  ), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'approved';

  -- Get confirmed chargebacks (NEW)
  SELECT COALESCE(SUM(amount), 0) INTO v_confirmed_chargebacks
  FROM chargebacks
  WHERE user_id = auth.uid() AND status = 'confirmed';

  RETURN json_build_object(
    'total_paid', ROUND(v_total_paid, 2),
    'total_fees', ROUND(v_total_fees, 2),
    'net_balance', ROUND(v_total_paid - v_total_fees, 2),
    'pending_withdrawals', ROUND(v_pending_withdrawals, 2),
    'approved_withdrawals', ROUND(v_approved_withdrawals, 2),
    'confirmed_chargebacks', ROUND(v_confirmed_chargebacks, 2),
    'available_balance', ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals - v_confirmed_chargebacks, 2),
    'transaction_count', v_transaction_count
  );
END;
$function$;