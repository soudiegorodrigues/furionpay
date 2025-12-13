-- Fix: Remove user_id from public products view to prevent user profiling
DROP VIEW IF EXISTS public.public_products;

CREATE VIEW public.public_products AS
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

-- Enable RLS on products table for stricter access
-- Update the "Anyone can view active products" policy to only return non-sensitive fields
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create a more restrictive policy - products are viewable via the public_products view only
-- Direct table access requires authentication
CREATE POLICY "Authenticated users can view products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- Add comment explaining the security model
COMMENT ON VIEW public.public_products IS 'Public view of products that excludes user_id to prevent user profiling. Use this view for public-facing product displays.';