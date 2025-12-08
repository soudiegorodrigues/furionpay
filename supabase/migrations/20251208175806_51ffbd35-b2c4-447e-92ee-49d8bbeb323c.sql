-- Deny INSERT via RLS - transactions should only be created via RPC functions with SECURITY DEFINER
CREATE POLICY "Deny direct insert to pix_transactions"
ON public.pix_transactions
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Add DELETE policy for profiles for GDPR compliance
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (id = auth.uid());