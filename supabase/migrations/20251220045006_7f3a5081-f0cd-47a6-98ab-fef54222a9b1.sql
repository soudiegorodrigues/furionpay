-- Update the default value for acquirer column from 'spedpay' to 'valorion'
ALTER TABLE public.pix_transactions 
ALTER COLUMN acquirer SET DEFAULT 'valorion';