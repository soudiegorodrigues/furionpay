-- Função RPC para reverter aprovações manuais de forma segura
CREATE OR REPLACE FUNCTION public.revert_manual_approval(
  p_txid text,
  p_admin_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction RECORD;
  v_result json;
BEGIN
  -- 1. Verificar se é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem reverter aprovações';
  END IF;
  
  -- 2. Buscar transação
  SELECT * INTO v_transaction
  FROM pix_transactions
  WHERE txid = p_txid;
  
  -- 3. Validações
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada: %', p_txid;
  END IF;
  
  IF v_transaction.status != 'paid' THEN
    RAISE EXCEPTION 'Transação não está paga. Status atual: %', v_transaction.status;
  END IF;
  
  IF v_transaction.is_manual_approval IS NOT TRUE THEN
    RAISE EXCEPTION 'Apenas aprovações manuais podem ser revertidas';
  END IF;
  
  -- 4. Reverter a aprovação
  UPDATE pix_transactions
  SET 
    status = 'generated',
    paid_at = NULL,
    approved_by_email = NULL,
    is_manual_approval = NULL
  WHERE txid = p_txid;
  
  -- 5. Retornar resultado
  SELECT json_build_object(
    'success', true,
    'txid', p_txid,
    'reverted_by', p_admin_email,
    'reverted_at', now(),
    'message', 'Aprovação manual revertida com sucesso'
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;