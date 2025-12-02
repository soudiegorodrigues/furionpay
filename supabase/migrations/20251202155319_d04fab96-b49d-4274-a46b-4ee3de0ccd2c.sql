-- Add product_name column to pix_transactions
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS product_name text;