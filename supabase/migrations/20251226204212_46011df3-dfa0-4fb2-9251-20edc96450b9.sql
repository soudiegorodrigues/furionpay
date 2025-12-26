-- Rename redirect_url to upsell_url and add downsell_url and crosssell_url
ALTER TABLE product_offers 
RENAME COLUMN redirect_url TO upsell_url;

ALTER TABLE product_offers 
ADD COLUMN downsell_url TEXT DEFAULT NULL;

ALTER TABLE product_offers 
ADD COLUMN crosssell_url TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN product_offers.upsell_url IS 'URL to redirect after purchasing the main offer (upsell page)';
COMMENT ON COLUMN product_offers.downsell_url IS 'URL to redirect after purchasing the upsell (downsell page)';
COMMENT ON COLUMN product_offers.crosssell_url IS 'URL to redirect after purchasing the downsell (cross-sell page)';

-- Update the RPC function to return all 3 URL fields
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
  upsell_url TEXT,
  downsell_url TEXT,
  crosssell_url TEXT
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
    po.upsell_url,
    po.downsell_url,
    po.crosssell_url
  FROM product_offers po
  INNER JOIN products p ON p.id = po.product_id
  WHERE po.offer_code = p_offer_code
    AND po.is_active = true
    AND p.is_active = true
  LIMIT 1;
END;
$$;