-- Function to update account balance when investment transactions change
CREATE OR REPLACE FUNCTION public.update_account_balance_on_investment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process investment transactions
  IF TG_OP = 'DELETE' THEN
    -- When investment is deleted, add the amount back to account
    IF OLD.type = 'investment' AND OLD.account_id IS NOT NULL THEN
      UPDATE finance_accounts 
      SET current_balance = current_balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- When investment is created, subtract from account balance
    IF NEW.type = 'investment' AND NEW.account_id IS NOT NULL THEN
      UPDATE finance_accounts 
      SET current_balance = current_balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Revert old investment if it was an investment with an account
    IF OLD.type = 'investment' AND OLD.account_id IS NOT NULL THEN
      UPDATE finance_accounts 
      SET current_balance = current_balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
    END IF;
    
    -- Apply new investment if it's an investment with an account
    IF NEW.type = 'investment' AND NEW.account_id IS NOT NULL THEN
      UPDATE finance_accounts 
      SET current_balance = current_balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger on finance_transactions table
DROP TRIGGER IF EXISTS trigger_update_account_balance_on_investment ON finance_transactions;

CREATE TRIGGER trigger_update_account_balance_on_investment
AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_investment();

-- Recalculate existing account balances based on investment transactions
UPDATE finance_accounts fa
SET current_balance = fa.initial_balance - COALESCE(
  (SELECT SUM(ft.amount) 
   FROM finance_transactions ft 
   WHERE ft.account_id = fa.id 
   AND ft.type = 'investment'), 0
),
updated_at = NOW();