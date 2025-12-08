-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Deny all direct access to password_reset_codes" ON public.password_reset_codes;

-- Create a restrictive policy that properly denies all access
CREATE POLICY "Deny all direct access to password_reset_codes" 
ON public.password_reset_codes
AS RESTRICTIVE
FOR ALL
TO public
USING (false)
WITH CHECK (false);