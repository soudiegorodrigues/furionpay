-- Ensure public checkout RPC functions can be executed by unauthenticated visitors (Meta Ads traffic)
DO $$
BEGIN
  IF to_regprocedure('public.get_public_offer_by_code(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_public_offer_by_code(text) TO anon, authenticated;
  END IF;

  IF to_regprocedure('public.get_public_checkout_config(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_public_checkout_config(uuid) TO anon, authenticated;
  END IF;

  IF to_regprocedure('public.get_public_order_bumps(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_public_order_bumps(uuid) TO anon, authenticated;
  END IF;
END $$;