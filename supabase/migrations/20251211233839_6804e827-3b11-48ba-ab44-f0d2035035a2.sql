-- Add discount percentage column to product_checkout_configs
ALTER TABLE public.product_checkout_configs
ADD COLUMN IF NOT EXISTS discount_popup_percentage numeric DEFAULT 10;