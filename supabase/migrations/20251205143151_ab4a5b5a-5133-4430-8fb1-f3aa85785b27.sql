-- Remove public policies from password_reset_codes
DROP POLICY IF EXISTS "Allow public insert" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Allow public select" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Allow public update" ON public.password_reset_codes;

-- Create restrictive policy that blocks all direct access
-- Edge functions using service_role key will still work (bypasses RLS)
CREATE POLICY "Deny all direct access to password_reset_codes" 
ON public.password_reset_codes 
FOR ALL 
USING (false);