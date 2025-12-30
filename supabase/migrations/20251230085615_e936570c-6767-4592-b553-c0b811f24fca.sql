-- Add product_pixels column for storing complete pixel configurations per product
ALTER TABLE public.product_checkout_configs 
ADD COLUMN IF NOT EXISTS product_pixels jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.product_checkout_configs.product_pixels IS 
'Array de pixels configurados especificamente para este produto, com configurações de eventos';