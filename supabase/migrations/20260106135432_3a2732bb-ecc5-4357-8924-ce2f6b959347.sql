-- Atualizar função get_offer_stats para usar transações em vez de cliques
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
    -- PIX Gerado: total de transações criadas
    COUNT(DISTINCT pt.id)::BIGINT as total_generated,
    -- PIX Pago: transações com status 'paid'
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'paid')::BIGINT as total_paid,
    -- Taxa%: pago / gerado * 100
    CASE
      WHEN COUNT(DISTINCT pt.id) > 0 THEN
        ROUND((COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'paid')::NUMERIC / 
               COUNT(DISTINCT pt.id)::NUMERIC) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM checkout_offers co
  LEFT JOIN pix_transactions pt ON 
    (pt.offer_id = co.id) OR 
    (pt.offer_id IS NULL AND pt.user_id = co.user_id AND pt.popup_model = co.popup_model AND pt.created_at >= co.created_at)
  WHERE co.user_id = p_user_id
  GROUP BY co.id;
END;
$$;