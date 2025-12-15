-- Função que cria a transação de receita automaticamente quando saque é aprovado
CREATE OR REPLACE FUNCTION public.auto_sync_approved_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_category_id uuid;
  v_existing_transaction_id uuid;
BEGIN
  -- Só executa quando status muda para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    
    -- Verifica se já existe uma transação para este saque (evita duplicatas)
    SELECT id INTO v_existing_transaction_id
    FROM finance_transactions
    WHERE user_id = NEW.user_id 
      AND description LIKE '%[ID: ' || NEW.id || ']%'
    LIMIT 1;
    
    -- Se já existe, não faz nada
    IF v_existing_transaction_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Busca categoria "Saques" para o usuário
    SELECT id INTO v_category_id
    FROM finance_categories
    WHERE user_id = NEW.user_id 
      AND name = 'Saques' 
      AND type = 'income'
    LIMIT 1;
    
    -- Se não existe, cria a categoria
    IF v_category_id IS NULL THEN
      INSERT INTO finance_categories (user_id, name, type, color, icon, is_default)
      VALUES (NEW.user_id, 'Saques', 'income', '#10b981', 'wallet', false)
      RETURNING id INTO v_category_id;
    END IF;
    
    -- Cria transação de receita com o valor líquido (amount = valor que usuário recebe)
    INSERT INTO finance_transactions (
      user_id, type, amount, description, date, category_id, 
      is_recurring, recurring_frequency, recurring_end_date
    ) VALUES (
      NEW.user_id,
      'income',
      NEW.amount,
      'Saque aprovado - ' || NEW.bank_name || ' [ID: ' || NEW.id || ']',
      COALESCE(NEW.processed_at::date, NOW()::date),
      v_category_id,
      false, null, null
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que dispara após aprovação de saque
DROP TRIGGER IF EXISTS trigger_auto_sync_withdrawal ON withdrawal_requests;

CREATE TRIGGER trigger_auto_sync_withdrawal
AFTER UPDATE ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_sync_approved_withdrawal();