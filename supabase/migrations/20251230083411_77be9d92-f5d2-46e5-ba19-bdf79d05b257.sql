-- Add selected_pixel_ids column to product_checkout_configs
ALTER TABLE public.product_checkout_configs 
ADD COLUMN IF NOT EXISTS selected_pixel_ids text[] DEFAULT '{}';

COMMENT ON COLUMN public.product_checkout_configs.selected_pixel_ids IS 'Array de IDs de pixels selecionados para este produto. Se vazio, usa todos os pixels globais.';