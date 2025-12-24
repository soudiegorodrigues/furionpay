-- Drop the existing policy that might not work for anonymous users
DROP POLICY IF EXISTS "Users can view testimonials for active products" ON public.product_testimonials;

-- Create a new policy using the security definer function
CREATE POLICY "Anyone can view testimonials for active products"
ON public.product_testimonials
FOR SELECT
TO anon, authenticated
USING (is_active_product(product_id) AND is_active = true);