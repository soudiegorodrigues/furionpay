-- Drop and recreate the get_public_offer_by_code function to include redirect_url
DROP FUNCTION IF EXISTS public.get_public_offer_by_code(TEXT);

CREATE FUNCTION public.get_public_offer_by_code(p_offer_code TEXT)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  name TEXT,
  type TEXT,
  domain TEXT,
  price NUMERIC,
  offer_code TEXT,
  product_name TEXT,
  product_description TEXT,
  product_image_url TEXT,
  product_price NUMERIC,
  product_code TEXT,
  redirect_url TEXT
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
    p.name AS product_name,
    p.description AS product_description,
    p.image_url AS product_image_url,
    p.price AS product_price,
    p.product_code,
    po.redirect_url
  FROM product_offers po
  INNER JOIN products p ON p.id = po.product_id
  WHERE po.offer_code = p_offer_code
    AND po.is_active = true
    AND p.is_active = true
  LIMIT 1;
END;
$$;