-- Add discount popup configuration columns to product_checkout_configs
ALTER TABLE public.product_checkout_configs
ADD COLUMN IF NOT EXISTS show_discount_popup boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_popup_title text,
ADD COLUMN IF NOT EXISTS discount_popup_message text,
ADD COLUMN IF NOT EXISTS discount_popup_cta text;