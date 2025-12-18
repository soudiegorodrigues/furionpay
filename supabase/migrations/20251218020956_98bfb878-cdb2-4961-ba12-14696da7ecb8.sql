-- 1) Clean up duplicated/invalid Ativus fee settings that break numeric casts elsewhere
DELETE FROM public.admin_settings
WHERE id IN (
  'df9eb4bc-1e7a-400e-9db1-005b0646f2b7', -- ativus_fee_rate with empty value
  'd427bd83-6514-45be-80f2-53340a69469c', -- ativus_fixed_fee old value 0.05 (keep newest 0)
  '520105ea-7c4b-4e4b-b57d-170173662666'  -- ativus_saque_fee_rate with empty value
);

-- 2) Restore frontend compatibility: allow calling get_platform_revenue_stats with p_user_email
-- The frontend currently calls:
--   supabase.rpc('get_platform_revenue_stats', { p_user_email: ... })
-- but the existing function signature is (p_acquirer_cost_filter TEXT).
-- We add an overloaded function (TEXT, TEXT) so PostgREST finds p_user_email.
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(
  p_user_email TEXT DEFAULT NULL,
  p_acquirer_cost_filter TEXT DEFAULT 'all'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- NOTE: For now, we keep the existing optimized implementation and simply
  -- forward to it (user email filtering is handled by other RPCs in the section).
  RETURN public.get_platform_revenue_stats(p_acquirer_cost_filter);
END;
$$;