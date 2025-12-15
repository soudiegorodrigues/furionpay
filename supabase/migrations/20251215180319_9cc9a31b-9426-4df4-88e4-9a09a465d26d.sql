
-- Create finance_accounts table for wallet management
CREATE TABLE public.finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking',
  bank_name TEXT,
  icon TEXT DEFAULT 'wallet',
  color TEXT DEFAULT '#10b981',
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own accounts"
ON public.finance_accounts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own accounts"
ON public.finance_accounts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own accounts"
ON public.finance_accounts FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own accounts"
ON public.finance_accounts FOR DELETE
USING (user_id = auth.uid());

-- Add account_id to finance_transactions
ALTER TABLE public.finance_transactions 
ADD COLUMN account_id UUID REFERENCES public.finance_accounts(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_finance_accounts_updated_at
BEFORE UPDATE ON public.finance_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_finance_updated_at();
