-- Add video_url column to product_checkout_configs
ALTER TABLE public.product_checkout_configs 
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- Add show_video column
ALTER TABLE public.product_checkout_configs 
ADD COLUMN IF NOT EXISTS show_video BOOLEAN DEFAULT false;