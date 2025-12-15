-- Add acquirer column to pix_transactions to track which payment gateway processed each transaction
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS acquirer TEXT DEFAULT 'spedpay';

-- Add comment for documentation
COMMENT ON COLUMN public.pix_transactions.acquirer IS 'Payment acquirer that processed the transaction: spedpay, inter, or ativus';