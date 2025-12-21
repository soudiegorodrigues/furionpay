-- Add person_type column to finance_transactions
ALTER TABLE public.finance_transactions 
ADD COLUMN IF NOT EXISTS person_type text DEFAULT 'PF' CHECK (person_type IN ('PF', 'PJ'));