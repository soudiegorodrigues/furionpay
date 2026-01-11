-- Add video poster URL column to product_checkout_configs
ALTER TABLE public.product_checkout_configs
ADD COLUMN IF NOT EXISTS video_poster_url TEXT;