-- Atualiza a função process_withdrawal para validar saldo antes de aprovar
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_withdrawal_id UUID,
  p_status withdrawal_status,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC;
  v_gross_amount NUMERIC;
  v_available_balance NUMERIC;
  v_total_paid NUMERIC;
  v_total_fees NUMERIC;
  v_other_pending NUMERIC;
  v_approved_withdrawals NUMERIC;
  v_user_fee_config_id UUID;
  v_fee_percentage NUMERIC;
  v_fee_fixed NUMERIC;
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas admins podem processar saques';
  END IF;

  -- Obter dados do saque
  SELECT user_id, amount, COALESCE(gross_amount, amount) 
  INTO v_user_id, v_amount, v_gross_amount
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Saque não encontrado ou já processado';
  END IF;

  -- Se for aprovação, validar saldo
  IF p_status = 'approved' THEN
    -- Obter configuração de taxas do usuário
    SELECT value::UUID INTO v_user_fee_config_id
    FROM admin_settings
    WHERE user_id = v_user_id AND key = 'user_fee_config'
    LIMIT 1;

    -- Obter taxas (do usuário ou default)
    IF v_user_fee_config_id IS NOT NULL THEN
      SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
      FROM public.fee_configs
      WHERE id = v_user_fee_config_id
      LIMIT 1;
    END IF;

    -- Fallback para taxa padrão
    IF v_fee_percentage IS NULL THEN
      SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
      FROM public.fee_configs
      WHERE is_default = true
      LIMIT 1;
    END IF;

    -- Calcular total de vendas pagas (líquido de taxas)
    SELECT COALESCE(SUM(
      amount - COALESCE(fee_fixed, v_fee_fixed) - (amount * COALESCE(fee_percentage, v_fee_percentage) / 100)
    ), 0) INTO v_total_paid
    FROM pix_transactions
    WHERE user_id = v_user_id AND status = 'paid';

    -- Calcular outros saques pendentes (excluindo este)
    SELECT COALESCE(SUM(
      CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
    ), 0) INTO v_other_pending
    FROM withdrawal_requests
    WHERE user_id = v_user_id 
      AND status = 'pending' 
      AND id != p_withdrawal_id;

    -- Calcular saques já aprovados
    SELECT COALESCE(SUM(
      CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
    ), 0) INTO v_approved_withdrawals
    FROM withdrawal_requests
    WHERE user_id = v_user_id AND status = 'approved';

    -- Calcular saldo disponível
    v_available_balance := v_total_paid - v_other_pending - v_approved_withdrawals;

    -- Validar saldo suficiente (usando gross_amount para considerar taxas de saque)
    IF v_gross_amount > v_available_balance THEN
      RAISE EXCEPTION 'Saldo insuficiente para aprovar este saque. Saldo disponível: R$ %, Valor necessário: R$ %', 
        ROUND(v_available_balance, 2), ROUND(v_gross_amount, 2);
    END IF;
  END IF;

  -- Processar o saque
  UPDATE public.withdrawal_requests
  SET 
    status = p_status,
    processed_at = now(),
    processed_by = auth.uid(),
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = p_withdrawal_id AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Criar função para obter saldo de um usuário específico (para uso admin)
CREATE OR REPLACE FUNCTION public.get_user_balance_for_admin(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_approved_withdrawals NUMERIC;
  v_user_fee_config_id UUID;
  v_fee_percentage NUMERIC;
  v_fee_fixed NUMERIC;
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas admins podem consultar saldos';
  END IF;

  -- Obter configuração de taxas do usuário
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = p_user_id AND key = 'user_fee_config'
  LIMIT 1;

  -- Obter taxas (do usuário ou default)
  IF v_user_fee_config_id IS NOT NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
    FROM public.fee_configs
    WHERE id = v_user_fee_config_id
    LIMIT 1;
  END IF;

  -- Fallback para taxa padrão
  IF v_fee_percentage IS NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
    FROM public.fee_configs
    WHERE is_default = true
    LIMIT 1;
  END IF;

  -- Calcular total de vendas pagas (líquido de taxas)
  SELECT COALESCE(SUM(
    amount - COALESCE(fee_fixed, v_fee_fixed) - (amount * COALESCE(fee_percentage, v_fee_percentage) / 100)
  ), 0) INTO v_total_paid
  FROM pix_transactions
  WHERE user_id = p_user_id AND status = 'paid';

  -- Calcular saques pendentes
  SELECT COALESCE(SUM(
    CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
  ), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'pending';

  -- Calcular saques aprovados
  SELECT COALESCE(SUM(
    CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
  ), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'approved';

  -- Retornar saldo disponível
  RETURN ROUND(v_total_paid - v_pending_withdrawals - v_approved_withdrawals, 2);
END;
$$;