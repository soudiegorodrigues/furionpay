-- =====================================================
-- SECURITY FIX: Protect sensitive profile fields
-- =====================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS protect_profile_sensitive_fields ON public.profiles;
DROP FUNCTION IF EXISTS prevent_sensitive_profile_updates();

-- Create function to prevent non-admin users from modifying sensitive fields
CREATE OR REPLACE FUNCTION prevent_sensitive_profile_updates()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN := false;
BEGIN
  -- Check if current user is admin using existing is_admin function
  BEGIN
    SELECT is_admin INTO is_admin_user FROM profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    is_admin_user := false;
  END;
  
  -- If not admin, preserve sensitive fields from OLD values
  IF NOT is_admin_user THEN
    -- Protect is_approved field
    IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
      NEW.is_approved := OLD.is_approved;
    END IF;
    
    -- Protect bypass_antifraud field
    IF OLD.bypass_antifraud IS DISTINCT FROM NEW.bypass_antifraud THEN
      NEW.bypass_antifraud := OLD.bypass_antifraud;
    END IF;
    
    -- Protect is_admin field (extra security)
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_sensitive_profile_updates();

-- =====================================================
-- SECURITY FIX: Secure RPC for order bumps (checkout)
-- =====================================================

-- Create secure RPC that returns only necessary fields for checkout
CREATE OR REPLACE FUNCTION get_public_order_bumps(p_product_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  bump_price NUMERIC,
  image_url TEXT,
  bump_product_id UUID,
  bump_product_name TEXT,
  bump_product_image_url TEXT
) 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pob.id,
    pob.title,
    pob.description,
    pob.bump_price,
    pob.image_url,
    p.id as bump_product_id,
    p.name as bump_product_name,
    p.image_url as bump_product_image_url
  FROM product_order_bumps pob
  LEFT JOIN products p ON p.id = pob.bump_product_id
  WHERE pob.product_id = p_product_id
    AND pob.is_active = true
  ORDER BY pob.position;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_public_order_bumps(UUID) TO anon, authenticated;

-- =====================================================
-- SECURITY FIX: Drop overly permissive order bumps policy
-- Keep only owner access policy
-- =====================================================

-- Drop public access policy
DROP POLICY IF EXISTS "Anyone can view order bumps for active products" ON public.product_order_bumps;

-- Create policy for owners only (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_order_bumps' 
    AND policyname = 'Users can view their own order bumps'
  ) THEN
    CREATE POLICY "Users can view their own order bumps"
    ON public.product_order_bumps
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;