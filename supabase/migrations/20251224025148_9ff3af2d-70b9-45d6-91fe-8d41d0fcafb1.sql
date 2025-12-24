-- Add image_url column to product_order_bumps
ALTER TABLE public.product_order_bumps 
ADD COLUMN image_url TEXT;