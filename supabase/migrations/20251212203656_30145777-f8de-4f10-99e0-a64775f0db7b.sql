
-- Corrigir a função request_withdrawal para validar com precisão decimal
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_bank_code text, p_bank_name text, p_pix_key_type text, p_pix_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_available_balance NUMERIC;
  v_withdrawal_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get available balance with proper rounding
  v_available_balance := ROUND(public.get_user_available_balance(), 2);

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  -- Compare with 2 decimal precision to avoid floating point issues
  IF ROUND(p_amount, 2) > v_available_balance THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %', v_available_balance;
  END IF;

  -- Create withdrawal request with rounded amount
  INSERT INTO public.withdrawal_requests (
    user_id, amount, bank_code, bank_name, pix_key_type, pix_key
  ) VALUES (
    auth.uid(), ROUND(p_amount, 2), p_bank_code, p_bank_name, p_pix_key_type, p_pix_key
  ) RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$function$;
