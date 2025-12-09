-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Deny all direct access to login_attempts" ON public.login_attempts;

-- Create a proper permissive policy that denies all access
CREATE POLICY "Deny all direct access to login_attempts"
ON public.login_attempts
AS PERMISSIVE
FOR ALL
TO public
USING (false)
WITH CHECK (false);