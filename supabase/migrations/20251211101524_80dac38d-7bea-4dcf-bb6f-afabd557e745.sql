-- Add RLS policy to allow public access to offers by offer_code
CREATE POLICY "Anyone can view offers by offer_code"
ON public.product_offers
FOR SELECT
USING (is_active = true);

-- Also need public access to products for checkout display
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);