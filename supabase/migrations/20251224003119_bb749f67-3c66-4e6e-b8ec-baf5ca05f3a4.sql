-- Create a SECURITY DEFINER function to check if a product is active
-- This allows public/anonymous users to verify product status without direct access to products table
CREATE OR REPLACE FUNCTION public.is_active_product(p_product_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = p_product_id AND is_active = true
  );
END;
$$;

-- Drop the existing policy that depends on products table access
DROP POLICY IF EXISTS "Anyone can view banners for active products" ON public.checkout_banners;

-- Create new policy using the SECURITY DEFINER function
CREATE POLICY "Anyone can view banners for active products" 
ON public.checkout_banners 
FOR SELECT 
USING (is_active_product(product_id));