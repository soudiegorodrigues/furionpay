-- Add customer data columns to pix_transactions
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS donor_phone text,
ADD COLUMN IF NOT EXISTS donor_cpf text,
ADD COLUMN IF NOT EXISTS donor_birthdate date,
ADD COLUMN IF NOT EXISTS donor_cep text,
ADD COLUMN IF NOT EXISTS donor_street text,
ADD COLUMN IF NOT EXISTS donor_number text,
ADD COLUMN IF NOT EXISTS donor_complement text,
ADD COLUMN IF NOT EXISTS donor_neighborhood text,
ADD COLUMN IF NOT EXISTS donor_city text,
ADD COLUMN IF NOT EXISTS donor_state text;

-- Add comments for documentation
COMMENT ON COLUMN public.pix_transactions.donor_phone IS 'Customer phone number from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_cpf IS 'Customer CPF from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_birthdate IS 'Customer birthdate from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_cep IS 'Customer address CEP from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_street IS 'Customer street from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_number IS 'Customer address number from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_complement IS 'Customer address complement from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_neighborhood IS 'Customer neighborhood from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_city IS 'Customer city from checkout';
COMMENT ON COLUMN public.pix_transactions.donor_state IS 'Customer state from checkout';