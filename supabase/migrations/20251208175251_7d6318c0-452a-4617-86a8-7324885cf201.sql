-- Fix security: pix_transactions - only users can view their own transactions, plus allow null user_id for public transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.pix_transactions;

CREATE POLICY "Users can view their own transactions"
ON public.pix_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Add policy for public/anonymous transactions (where user_id IS NULL) - these can only be accessed via RPC functions
CREATE POLICY "Allow service role full access to pix_transactions"
ON public.pix_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix security: profiles - only users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Fix security: admin_settings - only users can view their own settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.admin_settings;

CREATE POLICY "Users can view their own settings"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fix security: products - only users can view their own products
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;

CREATE POLICY "Users can view their own products"
ON public.products
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fix security: popup_configurations - only users can view their own configurations
DROP POLICY IF EXISTS "Users can view their own popup configurations" ON public.popup_configurations;

CREATE POLICY "Users can view their own popup configurations"
ON public.popup_configurations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fix security: product_folders - only users can view their own folders
DROP POLICY IF EXISTS "Users can view their own folders" ON public.product_folders;

CREATE POLICY "Users can view their own folders"
ON public.product_folders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());