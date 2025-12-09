-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view active domains" ON public.available_domains;

-- Create new SELECT policy that allows admins to view all domains
-- and non-admins to view only active domains
CREATE POLICY "Anyone can view active domains or admin can view all" 
ON public.available_domains 
FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));