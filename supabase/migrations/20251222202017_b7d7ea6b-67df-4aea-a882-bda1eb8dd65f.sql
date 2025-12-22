-- Add donor_email column to pix_transactions table
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS donor_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.pix_transactions.donor_email IS 'Email do cliente/doador para contato e identificação';