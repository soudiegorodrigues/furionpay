-- Add meta_pixel_ids column to support multiple pixels
ALTER TABLE public.checkout_offers 
ADD COLUMN meta_pixel_ids text[] DEFAULT '{}';

-- Migrate existing data from meta_pixel_id to meta_pixel_ids
UPDATE public.checkout_offers 
SET meta_pixel_ids = ARRAY[meta_pixel_id]::text[]
WHERE meta_pixel_id IS NOT NULL AND meta_pixel_id != '';

-- Drop the old column
ALTER TABLE public.checkout_offers 
DROP COLUMN meta_pixel_id;