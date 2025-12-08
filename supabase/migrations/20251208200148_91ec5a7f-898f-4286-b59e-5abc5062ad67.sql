-- Add restrictive policy to deny all UPDATE operations on pix_transactions
CREATE POLICY "Deny all updates to pix_transactions" 
ON public.pix_transactions
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

-- Add restrictive policy to deny all DELETE operations on pix_transactions
CREATE POLICY "Deny all deletes to pix_transactions" 
ON public.pix_transactions
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);