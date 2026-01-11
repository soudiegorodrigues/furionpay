-- Add column for custom play overlay image on video
ALTER TABLE public.product_checkout_configs
ADD COLUMN IF NOT EXISTS video_play_overlay_url TEXT;