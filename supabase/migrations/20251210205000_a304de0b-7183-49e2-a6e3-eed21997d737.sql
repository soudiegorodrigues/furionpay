-- Allow admins to view all user settings
CREATE POLICY "Admins can view all settings"
ON public.admin_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to insert settings for any user
CREATE POLICY "Admins can insert settings for any user"
ON public.admin_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to update settings for any user
CREATE POLICY "Admins can update settings for any user"
ON public.admin_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete settings for any user
CREATE POLICY "Admins can delete settings for any user"
ON public.admin_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));