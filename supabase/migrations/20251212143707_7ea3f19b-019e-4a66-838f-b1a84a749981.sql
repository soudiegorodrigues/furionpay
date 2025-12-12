-- Update get_user_available_balance to deduct platform fees from user balance
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
  v_fee_config RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  -- Get default fee config
  SELECT pix_percentage, pix_fixed INTO v_fee_config
  FROM public.fee_configs
  WHERE is_default = true
  LIMIT 1;

  -- Get total paid transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM pix_transactions
  WHERE user_id = auth.uid() AND status = 'paid';

  -- Calculate total fees (percentage + fixed per transaction)
  IF v_fee_config IS NOT NULL THEN
    SELECT COALESCE(
      SUM(
        (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
      ), 0
    ) INTO v_total_fees
    FROM pix_transactions
    WHERE user_id = auth.uid() AND status = 'paid';
  ELSE
    v_total_fees := 0;
  END IF;

  -- Get pending withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'pending';

  -- Get approved withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'approved';

  -- Available balance = Total paid - Fees - Pending withdrawals - Approved withdrawals
  RETURN ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals, 2);
END;
$function$;

-- Create function to get user net balance details (for dashboard display)
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
  v_fee_config RECORD;
  v_transaction_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'total_paid', 0,
      'total_fees', 0,
      'net_balance', 0,
      'pending_withdrawals', 0,
      'approved_withdrawals', 0,
      'available_balance', 0,
      'transaction_count', 0
    );
  END IF;

  -- Get default fee config
  SELECT pix_percentage, pix_fixed INTO v_fee_config
  FROM public.fee_configs
  WHERE is_default = true
  LIMIT 1;

  -- Get total paid transactions and count
  SELECT COALESCE(SUM(amount), 0), COUNT(*) INTO v_total_paid, v_transaction_count
  FROM pix_transactions
  WHERE user_id = auth.uid() AND status = 'paid';

  -- Calculate total fees
  IF v_fee_config IS NOT NULL THEN
    SELECT COALESCE(
      SUM(
        (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
      ), 0
    ) INTO v_total_fees
    FROM pix_transactions
    WHERE user_id = auth.uid() AND status = 'paid';
  ELSE
    v_total_fees := 0;
  END IF;

  -- Get pending withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'pending';

  -- Get approved withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'approved';

  RETURN json_build_object(
    'total_paid', ROUND(v_total_paid, 2),
    'total_fees', ROUND(v_total_fees, 2),
    'net_balance', ROUND(v_total_paid - v_total_fees, 2),
    'pending_withdrawals', ROUND(v_pending_withdrawals, 2),
    'approved_withdrawals', ROUND(v_approved_withdrawals, 2),
    'available_balance', ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals, 2),
    'transaction_count', v_transaction_count
  );
END;
$function$;