-- 1. TABELA DE LOG DE AUDITORIA PARA SAQUES
CREATE TABLE IF NOT EXISTS public.withdrawal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID REFERENCES withdrawal_requests(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  admin_id UUID,
  action TEXT NOT NULL, -- 'requested', 'approved', 'rejected', 'validation_failed'
  gross_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  available_balance_at_action NUMERIC NOT NULL,
  validation_passed BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_user_id ON withdrawal_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_withdrawal_id ON withdrawal_audit_log(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_created_at ON withdrawal_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_action ON withdrawal_audit_log(action);

-- RLS para audit log
ALTER TABLE withdrawal_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
ON withdrawal_audit_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON withdrawal_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. FUNÇÃO RPC PARA APROVAR SAQUE COM VALIDAÇÃO DUPLA
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_withdrawal_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_withdrawal RECORD;
  v_available_balance NUMERIC;
  v_result JSON;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
  v_total_paid NUMERIC;
  v_total_fees NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_approved_withdrawals NUMERIC;
BEGIN
  -- Verificar se é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar saques';
  END IF;

  -- Buscar o saque
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  IF v_withdrawal.status != 'pending' THEN
    RAISE EXCEPTION 'Saque não está pendente. Status atual: %', v_withdrawal.status;
  END IF;

  -- RECALCULAR SALDO EM TEMPO REAL (mesma lógica do get_user_available_balance)
  -- Get user's specific fee config
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = v_withdrawal.user_id AND key = 'user_fee_config'
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

  -- Total pago
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM pix_transactions
  WHERE user_id = v_withdrawal.user_id AND status = 'paid';

  -- Total taxas
  SELECT COALESCE(
    SUM(
      CASE
        WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
          (amount * fee_percentage / 100) + fee_fixed
        WHEN v_fee_config IS NOT NULL THEN
          (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
        ELSE 0
      END
    ), 0
  ) INTO v_total_fees
  FROM pix_transactions
  WHERE user_id = v_withdrawal.user_id AND status = 'paid';

  -- Saques pendentes (EXCLUINDO o saque atual que estamos aprovando)
  SELECT COALESCE(SUM(
    CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
  ), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = v_withdrawal.user_id 
    AND status = 'pending'
    AND id != p_withdrawal_id;

  -- Saques aprovados
  SELECT COALESCE(SUM(
    CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
  ), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = v_withdrawal.user_id AND status = 'approved';

  -- Calcular saldo disponível (sem considerar o saque atual)
  v_available_balance := ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals, 2);

  -- VALIDAÇÃO: Verificar se o saldo é suficiente
  IF v_available_balance < COALESCE(v_withdrawal.gross_amount, v_withdrawal.amount) THEN
    -- Log da falha de validação
    INSERT INTO withdrawal_audit_log (
      withdrawal_id, user_id, admin_id, action,
      gross_amount, net_amount, available_balance_at_action,
      validation_passed, error_message, metadata
    ) VALUES (
      p_withdrawal_id, v_withdrawal.user_id, auth.uid(), 'validation_failed',
      COALESCE(v_withdrawal.gross_amount, v_withdrawal.amount), v_withdrawal.amount,
      v_available_balance, false,
      format('Saldo insuficiente. Necessário: R$ %s, Disponível: R$ %s', 
        COALESCE(v_withdrawal.gross_amount, v_withdrawal.amount), v_available_balance),
      jsonb_build_object(
        'total_paid', v_total_paid,
        'total_fees', v_total_fees,
        'pending_withdrawals', v_pending_withdrawals,
        'approved_withdrawals', v_approved_withdrawals
      )
    );

    RAISE EXCEPTION 'Saldo insuficiente. Necessário: R$ %, Disponível: R$ %', 
      COALESCE(v_withdrawal.gross_amount, v_withdrawal.amount), v_available_balance;
  END IF;

  -- APROVAR O SAQUE
  UPDATE withdrawal_requests
  SET 
    status = 'approved',
    processed_at = NOW(),
    processed_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- Log de sucesso
  INSERT INTO withdrawal_audit_log (
    withdrawal_id, user_id, admin_id, action,
    gross_amount, net_amount, available_balance_at_action,
    validation_passed, metadata
  ) VALUES (
    p_withdrawal_id, v_withdrawal.user_id, auth.uid(), 'approved',
    COALESCE(v_withdrawal.gross_amount, v_withdrawal.amount), v_withdrawal.amount,
    v_available_balance, true,
    jsonb_build_object(
      'admin_notes', p_admin_notes,
      'total_paid', v_total_paid,
      'total_fees', v_total_fees,
      'new_available_balance', v_available_balance - COALESCE(v_withdrawal.gross_amount, v_withdrawal.amount)
    )
  );

  SELECT json_build_object(
    'success', true,
    'message', 'Saque aprovado com sucesso',
    'withdrawal_id', p_withdrawal_id,
    'amount', v_withdrawal.amount,
    'gross_amount', v_withdrawal.gross_amount,
    'available_balance_before', v_available_balance,
    'available_balance_after', v_available_balance - COALESCE(v_withdrawal.gross_amount, v_withdrawal.amount)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 3. FUNÇÃO RPC PARA REJEITAR SAQUE COM LOG
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  p_withdrawal_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_withdrawal RECORD;
  v_available_balance NUMERIC;
BEGIN
  -- Verificar se é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem rejeitar saques';
  END IF;

  -- Buscar o saque
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  IF v_withdrawal.status != 'pending' THEN
    RAISE EXCEPTION 'Saque não está pendente. Status atual: %', v_withdrawal.status;
  END IF;

  -- Buscar saldo atual para log
  SELECT public.get_user_available_balance() INTO v_available_balance;

  -- REJEITAR O SAQUE
  UPDATE withdrawal_requests
  SET 
    status = 'rejected',
    rejection_reason = p_rejection_reason,
    processed_at = NOW(),
    processed_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- Log de rejeição
  INSERT INTO withdrawal_audit_log (
    withdrawal_id, user_id, admin_id, action,
    gross_amount, net_amount, available_balance_at_action,
    validation_passed, error_message, metadata
  ) VALUES (
    p_withdrawal_id, v_withdrawal.user_id, auth.uid(), 'rejected',
    COALESCE(v_withdrawal.gross_amount, v_withdrawal.amount), v_withdrawal.amount,
    v_available_balance, true, p_rejection_reason,
    jsonb_build_object('rejection_reason', p_rejection_reason)
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Saque rejeitado',
    'withdrawal_id', p_withdrawal_id
  );
END;
$$;

-- 4. TRIGGER DE PROTEÇÃO - Impede aprovação direta sem validação
CREATE OR REPLACE FUNCTION public.validate_withdrawal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available_balance NUMERIC;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
  v_total_paid NUMERIC;
  v_total_fees NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_approved_withdrawals NUMERIC;
BEGIN
  -- Só valida se estiver mudando de 'pending' para 'approved'
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    
    -- Recalcular saldo em tempo real
    SELECT value::UUID INTO v_user_fee_config_id
    FROM admin_settings
    WHERE user_id = NEW.user_id AND key = 'user_fee_config'
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

    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM pix_transactions
    WHERE user_id = NEW.user_id AND status = 'paid';

    SELECT COALESCE(
      SUM(
        CASE
          WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
            (amount * fee_percentage / 100) + fee_fixed
          WHEN v_fee_config IS NOT NULL THEN
            (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
          ELSE 0
        END
      ), 0
    ) INTO v_total_fees
    FROM pix_transactions
    WHERE user_id = NEW.user_id AND status = 'paid';

    -- Saques pendentes (excluindo o atual)
    SELECT COALESCE(SUM(
      CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
    ), 0) INTO v_pending_withdrawals
    FROM withdrawal_requests
    WHERE user_id = NEW.user_id 
      AND status = 'pending'
      AND id != NEW.id;

    SELECT COALESCE(SUM(
      CASE WHEN gross_amount IS NOT NULL THEN gross_amount ELSE amount END
    ), 0) INTO v_approved_withdrawals
    FROM withdrawal_requests
    WHERE user_id = NEW.user_id AND status = 'approved';

    v_available_balance := ROUND(v_total_paid - v_total_fees - v_pending_withdrawals - v_approved_withdrawals, 2);

    -- Bloquear se saldo insuficiente
    IF v_available_balance < COALESCE(NEW.gross_amount, NEW.amount) THEN
      RAISE EXCEPTION 'TRIGGER_BLOCK: Saldo insuficiente para aprovar saque. Necessário: R$ %, Disponível: R$ %',
        COALESCE(NEW.gross_amount, NEW.amount), v_available_balance;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar o trigger
DROP TRIGGER IF EXISTS trg_validate_withdrawal_approval ON withdrawal_requests;
CREATE TRIGGER trg_validate_withdrawal_approval
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_withdrawal_status_change();

-- 5. ATUALIZAR request_withdrawal para incluir log de auditoria
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_bank_code TEXT,
  p_bank_name TEXT,
  p_pix_key_type TEXT,
  p_pix_key TEXT,
  p_acquirer TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_effective_owner_id UUID;
  v_available_balance NUMERIC;
  v_fee_config RECORD;
  v_withdrawal_fee_percentage NUMERIC;
  v_withdrawal_fee_fixed NUMERIC;
  v_fee_amount NUMERIC;
  v_gross_amount NUMERIC;
  v_min_amount NUMERIC := 50;
  v_new_withdrawal_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(v_user_id);

  -- Validar valor mínimo (valor líquido)
  IF p_amount < v_min_amount THEN
    RAISE EXCEPTION 'O valor mínimo para saque é R$ %', v_min_amount;
  END IF;

  -- Buscar configuração de taxas de saque
  SELECT saque_percentage, saque_fixed INTO v_fee_config
  FROM public.fee_configs
  WHERE is_default = true
  LIMIT 1;

  v_withdrawal_fee_percentage := COALESCE(v_fee_config.saque_percentage, 0);
  v_withdrawal_fee_fixed := COALESCE(v_fee_config.saque_fixed, 5);

  -- Calcular valor bruto
  v_fee_amount := (p_amount * v_withdrawal_fee_percentage / 100) + v_withdrawal_fee_fixed;
  v_gross_amount := p_amount + v_fee_amount;

  -- Verificar saldo disponível
  SELECT public.get_user_available_balance() INTO v_available_balance;

  IF v_available_balance < v_gross_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %, Necessário: R$ % (líquido: R$ % + taxa: R$ %)', 
      v_available_balance, v_gross_amount, p_amount, v_fee_amount;
  END IF;

  -- Criar solicitação de saque
  INSERT INTO withdrawal_requests (
    user_id, amount, gross_amount,
    fee_percentage, fee_fixed,
    bank_code, bank_name, pix_key_type, pix_key, acquirer, status
  ) VALUES (
    v_effective_owner_id, p_amount, v_gross_amount,
    v_withdrawal_fee_percentage, v_withdrawal_fee_fixed,
    p_bank_code, p_bank_name, p_pix_key_type, p_pix_key, p_acquirer, 'pending'
  )
  RETURNING id INTO v_new_withdrawal_id;

  -- Log de auditoria
  INSERT INTO withdrawal_audit_log (
    withdrawal_id, user_id, admin_id, action,
    gross_amount, net_amount, available_balance_at_action,
    validation_passed, metadata
  ) VALUES (
    v_new_withdrawal_id, v_effective_owner_id, NULL, 'requested',
    v_gross_amount, p_amount, v_available_balance,
    true,
    jsonb_build_object(
      'bank_name', p_bank_name,
      'pix_key', p_pix_key,
      'fee_amount', v_fee_amount,
      'balance_after', v_available_balance - v_gross_amount
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Solicitação de saque criada com sucesso',
    'withdrawal_id', v_new_withdrawal_id,
    'amount', p_amount,
    'gross_amount', v_gross_amount,
    'fee', v_fee_amount,
    'available_balance_after', v_available_balance - v_gross_amount
  );
END;
$$;