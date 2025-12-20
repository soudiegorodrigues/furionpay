-- Função para exclusão segura de transações de teste (apenas admin)
-- Permite deletar transações com valores típicos de teste: 0.01, 0.50, 1.00, 5.00
CREATE OR REPLACE FUNCTION public.delete_test_transactions(transaction_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Verificar se é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir transações de teste';
  END IF;
  
  -- Deletar apenas transações com valores típicos de teste
  DELETE FROM pix_transactions 
  WHERE id = ANY(transaction_ids)
    AND amount IN (0.01, 0.50, 1.00, 5.00);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE LOG '[CLEANUP] Admin % deleted % test transactions', auth.uid(), deleted_count;
  
  RETURN deleted_count;
END;
$$;