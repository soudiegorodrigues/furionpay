-- 1. Drop the public_products view that lacks RLS
DROP VIEW IF EXISTS public_products;

-- 2. Update products table RLS policy to exclude user_id from public access
-- First drop the old public policy
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create a security definer function to get public product data without user_id
CREATE OR REPLACE FUNCTION public.get_public_product_by_code(p_product_code TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  image_url TEXT,
  is_active BOOLEAN,
  product_code TEXT,
  website_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.is_active,
    p.product_code,
    p.website_url
  FROM products p
  WHERE p.product_code = p_product_code
    AND p.is_active = true;
END;
$$;

-- Create a function to get public product by ID without user_id
CREATE OR REPLACE FUNCTION public.get_public_product_by_id(p_product_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  image_url TEXT,
  is_active BOOLEAN,
  product_code TEXT,
  website_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.is_active,
    p.product_code,
    p.website_url
  FROM products p
  WHERE p.id = p_product_id
    AND p.is_active = true;
END;
$$;