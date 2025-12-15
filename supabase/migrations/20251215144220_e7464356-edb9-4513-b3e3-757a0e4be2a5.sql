-- Criar função para deletar transações de teste (apenas admins)
CREATE OR REPLACE FUNCTION public.delete_test_transaction(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can delete test transactions';
  END IF;

  -- Deletar apenas se for transação de teste
  DELETE FROM pix_transactions
  WHERE id = p_transaction_id
    AND (txid LIKE 'TEST_%' OR product_name = 'Produto Demonstração');

  RETURN FOUND;
END;
$$;