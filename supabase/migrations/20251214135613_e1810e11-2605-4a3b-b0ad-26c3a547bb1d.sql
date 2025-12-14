-- Add fee columns to withdrawal_requests table
ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_fixed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC;

-- Update request_withdrawal function to store fees
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_bank_code text, p_bank_name text, p_pix_key_type text, p_pix_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_available_balance NUMERIC;
  v_withdrawal_id UUID;
  v_minimum_withdrawal NUMERIC := 50;
  v_user_fee_config_id UUID;
  v_fee_percentage NUMERIC := 0;
  v_fee_fixed NUMERIC := 0;
  v_gross_amount NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's specific fee config from admin_settings
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = auth.uid() AND key = 'user_fee_config'
  LIMIT 1;

  -- Get fee config (user-specific or default)
  IF v_user_fee_config_id IS NOT NULL THEN
    SELECT saque_percentage, saque_fixed INTO v_fee_percentage, v_fee_fixed
    FROM public.fee_configs
    WHERE id = v_user_fee_config_id
    LIMIT 1;
  END IF;

  -- Fallback to default fee config
  IF v_fee_percentage IS NULL THEN
    SELECT saque_percentage, saque_fixed INTO v_fee_percentage, v_fee_fixed
    FROM public.fee_configs
    WHERE is_default = true
    LIMIT 1;
  END IF;

  -- Default to 0 if no config found
  v_fee_percentage := COALESCE(v_fee_percentage, 0);
  v_fee_fixed := COALESCE(v_fee_fixed, 0);

  -- Calculate gross amount (net amount + fees)
  v_gross_amount := ROUND(p_amount + (p_amount * v_fee_percentage / 100) + v_fee_fixed, 2);

  -- Get available balance with proper rounding
  v_available_balance := ROUND(public.get_user_available_balance(), 2);

  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  -- Validate minimum withdrawal amount (net amount)
  IF ROUND(p_amount, 2) < v_minimum_withdrawal THEN
    RAISE EXCEPTION 'O valor mínimo de saque é R$ 50,00';
  END IF;

  -- Compare gross amount with available balance
  IF v_gross_amount > v_available_balance THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %', v_available_balance;
  END IF;

  -- Create withdrawal request with fee information
  INSERT INTO public.withdrawal_requests (
    user_id, amount, bank_code, bank_name, pix_key_type, pix_key,
    fee_percentage, fee_fixed, gross_amount
  ) VALUES (
    auth.uid(), ROUND(p_amount, 2), p_bank_code, p_bank_name, p_pix_key_type, p_pix_key,
    v_fee_percentage, v_fee_fixed, v_gross_amount
  ) RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$function$;

-- Update get_user_available_balance to use gross_amount for pending and handle rejected properly
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

  -- Available balance = Total paid - Fees - Pending withdrawals - Approved withdrawals
  -- Note: Rejected withdrawals are NOT subtracted, so full gross_amount returns to balance
  RETURN ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals, 2);
END;
$function$;

-- Also update admin version for consistency
CREATE OR REPLACE FUNCTION public.get_user_available_balance_admin(p_user_id uuid)
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

  -- Get pending withdrawals - use gross_amount if available
  SELECT COALESCE(SUM(
    CASE 
      WHEN gross_amount IS NOT NULL THEN gross_amount
      ELSE amount
    END
  ), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'pending';

  -- Get approved withdrawals - use gross_amount if available
  SELECT COALESCE(SUM(
    CASE 
      WHEN gross_amount IS NOT NULL THEN gross_amount
      ELSE amount
    END
  ), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'approved';

  -- Available balance = Total paid - Fees - Pending withdrawals - Approved withdrawals
  RETURN ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals, 2);
END;
$function$;