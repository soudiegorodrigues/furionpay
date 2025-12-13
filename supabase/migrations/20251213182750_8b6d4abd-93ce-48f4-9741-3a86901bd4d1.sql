-- 1. Fix products table - remove overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;

-- 2. Create secure RPC function for public checkout (returns only necessary fields, no user_id)
CREATE OR REPLACE FUNCTION public.get_public_offer_by_code(p_offer_code text)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  name text,
  type text,
  domain text,
  price numeric,
  offer_code text,
  product_name text,
  product_description text,
  product_image_url text,
  product_price numeric,
  product_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id,
    po.product_id,
    po.name,
    po.type,
    po.domain,
    po.price,
    po.offer_code,
    p.name as product_name,
    p.description as product_description,
    p.image_url as product_image_url,
    p.price as product_price,
    p.product_code
  FROM product_offers po
  JOIN products p ON p.id = po.product_id
  WHERE po.offer_code = p_offer_code
    AND po.is_active = true
    AND p.is_active = true;
END;
$$;

-- 3. Remove overly permissive public SELECT policy from product_offers
DROP POLICY IF EXISTS "Anyone can view offers by offer_code" ON public.product_offers;