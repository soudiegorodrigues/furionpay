-- Add popup customization fields
ALTER TABLE public.product_checkout_configs 
ADD COLUMN IF NOT EXISTS discount_popup_color TEXT DEFAULT '#16A34A',
ADD COLUMN IF NOT EXISTS discount_popup_image_url TEXT;