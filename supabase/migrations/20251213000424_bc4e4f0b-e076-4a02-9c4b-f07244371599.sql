-- Fix: Recreate view without SECURITY DEFINER to avoid security issues
DROP VIEW IF EXISTS public.public_products;

CREATE VIEW public.public_products 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  description,
  price,
  image_url,
  is_active,
  product_code,
  website_url,
  folder_id,
  created_at,
  updated_at
FROM public.products
WHERE is_active = true;

COMMENT ON VIEW public.public_products IS 'Public view of products that excludes user_id to prevent user profiling. Uses security_invoker for proper RLS enforcement.';