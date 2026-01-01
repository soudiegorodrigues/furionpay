-- Adicionar campo currency em finance_accounts
ALTER TABLE public.finance_accounts 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'BRL';

-- Adicionar campo currency em finance_transactions
ALTER TABLE public.finance_transactions 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'BRL';

-- Criar index para consultas por moeda
CREATE INDEX IF NOT EXISTS idx_finance_accounts_currency 
ON public.finance_accounts(currency);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_currency 
ON public.finance_transactions(currency);