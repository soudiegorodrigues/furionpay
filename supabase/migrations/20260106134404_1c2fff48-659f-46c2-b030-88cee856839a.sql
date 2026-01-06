-- Parte 1: Atualizar função get_offer_stats para fallback inteligente
-- Considera transações sem offer_id baseado em user_id + popup_model

CREATE OR REPLACE FUNCTION public.get_offer_stats(p_user_id UUID)
RETURNS TABLE (
  offer_id UUID,
  total_generated BIGINT,
  total_paid BIGINT,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    co.id as offer_id,
    COALESCE(co.click_count, 0)::BIGINT as total_generated,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'paid')::BIGINT as total_paid,
    CASE
      WHEN COALESCE(co.click_count, 0) > 0 THEN
        ROUND((COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'paid')::NUMERIC / 
               co.click_count::NUMERIC) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM checkout_offers co
  LEFT JOIN pix_transactions pt ON 
    (pt.offer_id = co.id) OR 
    (pt.offer_id IS NULL AND pt.user_id = co.user_id AND pt.popup_model = co.popup_model AND pt.created_at >= co.created_at)
  WHERE co.user_id = p_user_id
  GROUP BY co.id, co.click_count;
END;
$$;

-- Parte 2: Backfill das transações antigas com offer_id correto
-- Atualiza transações onde offer_id é null, vinculando com base em user_id + popup_model

UPDATE pix_transactions pt
SET offer_id = (
  SELECT co.id 
  FROM checkout_offers co 
  WHERE co.user_id = pt.user_id 
    AND co.popup_model = pt.popup_model
    AND pt.created_at >= co.created_at
  ORDER BY co.created_at DESC
  LIMIT 1
)
WHERE pt.offer_id IS NULL
  AND pt.popup_model IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM checkout_offers co 
    WHERE co.user_id = pt.user_id 
      AND co.popup_model = pt.popup_model
      AND pt.created_at >= co.created_at
  );