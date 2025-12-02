-- Deny all direct access - only functions can access
CREATE POLICY "Deny all direct access to admin_settings"
ON public.admin_settings
FOR ALL
USING (false);

CREATE POLICY "Deny all direct access to admin_tokens"
ON public.admin_tokens
FOR ALL
USING (false);