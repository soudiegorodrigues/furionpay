-- Add website_url column to products table
ALTER TABLE public.products
ADD COLUMN website_url text;