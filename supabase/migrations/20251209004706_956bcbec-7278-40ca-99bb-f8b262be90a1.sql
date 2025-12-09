-- Drop the old permissive policy
DROP POLICY IF EXISTS "Anyone can view active domains or admin can view all" ON public.available_domains;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view active domains or admin can view all"
ON public.available_domains
FOR SELECT
USING (
  (is_active = true AND auth.uid() IS NOT NULL) 
  OR has_role(auth.uid(), 'admin'::app_role)
);