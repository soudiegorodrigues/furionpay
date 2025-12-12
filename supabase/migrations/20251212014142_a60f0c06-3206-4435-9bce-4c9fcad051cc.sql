-- Add back_redirect_url column to product_checkout_configs
ALTER TABLE public.product_checkout_configs 
ADD COLUMN IF NOT EXISTS back_redirect_url TEXT DEFAULT NULL;