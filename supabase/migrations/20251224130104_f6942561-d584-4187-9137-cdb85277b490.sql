-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view active order bumps" ON public.product_order_bumps;

-- Create a more restrictive policy that only allows viewing order bumps for active products
-- This uses the security definer function is_active_product() to check product status
CREATE POLICY "Anyone can view order bumps for active products"
ON public.product_order_bumps
FOR SELECT
TO anon, authenticated
USING (is_active_product(product_id) AND is_active = true);