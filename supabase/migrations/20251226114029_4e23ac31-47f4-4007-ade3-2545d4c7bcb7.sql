-- Create function to get total available balance across all users
CREATE OR REPLACE FUNCTION public.get_all_users_available_balance()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_balance NUMERIC := 0;
  v_user_record RECORD;
  v_user_balance NUMERIC;
BEGIN
  -- Only admins can use this function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view total balances';
  END IF;

  -- For each user with paid transactions, calculate their balance
  FOR v_user_record IN 
    SELECT DISTINCT pt.user_id 
    FROM pix_transactions pt
    WHERE pt.status = 'paid' AND pt.user_id IS NOT NULL
  LOOP
    SELECT get_user_available_balance_admin(v_user_record.user_id) INTO v_user_balance;
    v_total_balance := v_total_balance + COALESCE(v_user_balance, 0);
  END LOOP;

  RETURN ROUND(v_total_balance, 2);
END;
$$;