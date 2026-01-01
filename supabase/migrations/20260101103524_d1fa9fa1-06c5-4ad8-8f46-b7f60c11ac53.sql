-- Corrigir valores USD existentes (estão em centavos, precisam estar em reais)
UPDATE public.finance_accounts 
SET initial_balance = initial_balance / 100,
    current_balance = current_balance / 100
WHERE currency = 'USD' AND (initial_balance > 1000 OR current_balance > 1000);

UPDATE public.finance_transactions
SET amount = amount / 100
WHERE currency = 'USD' AND amount > 1000;