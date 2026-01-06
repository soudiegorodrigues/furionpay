-- Add slug column to checkout_offers
ALTER TABLE checkout_offers 
ADD COLUMN slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE UNIQUE INDEX idx_checkout_offers_slug ON checkout_offers(slug) WHERE slug IS NOT NULL;

-- Create RPC function to get checkout offer by slug
CREATE OR REPLACE FUNCTION get_checkout_offer_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  name TEXT,
  domain TEXT,
  popup_model TEXT,
  product_name TEXT,
  meta_pixel_ids TEXT[],
  video_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    co.id,
    co.user_id,
    co.name,
    co.domain,
    co.popup_model,
    co.product_name,
    co.meta_pixel_ids,
    co.video_url
  FROM checkout_offers co
  WHERE co.slug = p_slug
  LIMIT 1;
END;
$$;