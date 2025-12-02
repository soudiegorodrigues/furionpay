-- 1. Add user_id to admin_settings to make it per-user
ALTER TABLE public.admin_settings 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id to pix_transactions to make it per-user
ALTER TABLE public.pix_transactions 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create function to auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 4. Create trigger to auto-assign role on user creation
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 5. Create function to check if user is authenticated (any role)
CREATE OR REPLACE FUNCTION public.is_user_authenticated()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- 6. Update admin_settings RLS to allow users to manage their own settings
DROP POLICY IF EXISTS "Deny all direct access to admin_settings" ON public.admin_settings;

CREATE POLICY "Users can view their own settings"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
ON public.admin_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
ON public.admin_settings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own settings"
ON public.admin_settings
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 7. Update pix_transactions RLS to allow users to manage their own transactions
DROP POLICY IF EXISTS "Deny all direct access to pix_transactions" ON public.pix_transactions;
DROP POLICY IF EXISTS "Allow public read of own transaction by id" ON public.pix_transactions;

CREATE POLICY "Users can view their own transactions"
ON public.pix_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Public can view transactions by id"
ON public.pix_transactions
FOR SELECT
TO anon
USING (true);

-- 8. Create user-scoped functions for settings
CREATE OR REPLACE FUNCTION public.get_user_settings()
RETURNS TABLE(key text, value text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY SELECT s.key, s.value FROM public.admin_settings s WHERE s.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_setting(setting_key text, setting_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO public.admin_settings (key, value, user_id, created_at, updated_at)
  VALUES (setting_key, setting_value, auth.uid(), now(), now())
  ON CONFLICT (key, user_id) DO UPDATE
  SET value = setting_value, updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- 9. Add unique constraint for key + user_id
ALTER TABLE public.admin_settings DROP CONSTRAINT IF EXISTS admin_settings_pkey;
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_key_user_unique UNIQUE (key, user_id);

-- 10. Create user-scoped dashboard function
CREATE OR REPLACE FUNCTION public.get_user_dashboard()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid()),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid()), 0),
    'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'), 0),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND created_at >= CURRENT_DATE),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND paid_at >= CURRENT_DATE),
    'today_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND paid_at >= CURRENT_DATE), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 11. Create user-scoped transactions function
CREATE OR REPLACE FUNCTION public.get_user_transactions(p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, amount numeric, status pix_status, txid text, donor_name text, product_name text, created_at timestamp with time zone, paid_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at
  FROM public.pix_transactions t
  WHERE t.user_id = auth.uid()
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 12. Create user-scoped reset function
CREATE OR REPLACE FUNCTION public.reset_user_transactions()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM public.pix_transactions WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$$;

-- 13. Update log_pix_generated to include user_id (create new overload)
CREATE OR REPLACE FUNCTION public.log_pix_generated_user(p_amount numeric, p_txid text, p_pix_code text, p_donor_name text, p_utm_data jsonb DEFAULT NULL::jsonb, p_product_name text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data, product_name, user_id)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data, p_product_name, p_user_id)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;