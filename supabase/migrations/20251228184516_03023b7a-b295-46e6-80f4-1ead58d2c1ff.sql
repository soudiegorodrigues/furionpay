-- Corrigir função para SOMAR investimentos ao saldo (investimentos aumentam patrimônio)
CREATE OR REPLACE FUNCTION public.update_account_balance_on_investment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process investment transactions
  IF TG_OP = 'DELETE' THEN
    -- When investment is deleted, SUBTRACT the amount (revert the addition)
    IF OLD.type = 'investment' AND OLD.account_id IS NOT NULL THEN
      UPDATE finance_accounts 
      SET current_balance = current_balance - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- When investment is created, ADD to account balance (investments increase wealth)
    IF NEW.type = 'investment' AND NEW.account_id IS NOT NULL THEN
      UPDATE finance_accounts 
      SET current_balance = current_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Revert old investment (subtract it)
    IF OLD.type = 'investment' AND OLD.account_id IS NOT NULL THEN
      UPDATE finance_accounts 
      SET current_balance = current_balance - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
    END IF;
    
    -- Apply new investment (add it)
    IF NEW.type = 'investment' AND NEW.account_id IS NOT NULL THEN
      UPDATE finance_accounts 
      SET current_balance = current_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Recalcular saldos existentes: initial_balance + SUM(investments)
UPDATE finance_accounts fa
SET current_balance = fa.initial_balance + COALESCE(
  (SELECT SUM(ft.amount) 
   FROM finance_transactions ft 
   WHERE ft.account_id = fa.id 
   AND ft.type = 'investment'), 0
),
updated_at = NOW();