-- Drop and recreate the function with date parameters
DROP FUNCTION IF EXISTS public.get_offer_stats(uuid);
DROP FUNCTION IF EXISTS public.get_offer_stats(uuid, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_offer_stats(
  p_user_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  offer_id uuid, 
  total_generated bigint, 
  total_paid bigint, 
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    co.id as offer_id,
    COUNT(DISTINCT pt.id)::BIGINT as total_generated,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'paid')::BIGINT as total_paid,
    CASE
      WHEN COUNT(DISTINCT pt.id) > 0 THEN
        ROUND((COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'paid')::NUMERIC / 
               COUNT(DISTINCT pt.id)::NUMERIC) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM checkout_offers co
  LEFT JOIN pix_transactions pt ON 
    (
      (pt.offer_id = co.id) OR 
      (pt.offer_id IS NULL AND pt.user_id = co.user_id AND pt.popup_model = co.popup_model AND pt.created_at >= co.created_at)
    )
    AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pt.created_at <= p_end_date)
  WHERE co.user_id = p_user_id
  GROUP BY co.id;
END;
$$;