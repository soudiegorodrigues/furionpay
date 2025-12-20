-- Remove the public read policy that exposes payment provider information
DROP POLICY IF EXISTS "Public read access to health status" ON public.acquirer_health_status;

-- Create restricted policy for admins only
CREATE POLICY "Admins can view health status" 
ON public.acquirer_health_status 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));