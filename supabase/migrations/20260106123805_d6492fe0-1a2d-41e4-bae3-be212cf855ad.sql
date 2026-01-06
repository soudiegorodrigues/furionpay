-- Adicionar coluna offer_id na tabela pix_transactions
ALTER TABLE pix_transactions 
ADD COLUMN offer_id UUID REFERENCES checkout_offers(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX idx_pix_transactions_offer_id ON pix_transactions(offer_id);

-- Função RPC para obter estatísticas por oferta
CREATE OR REPLACE FUNCTION get_offer_stats(p_user_id UUID)
RETURNS TABLE(
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
    COUNT(pt.id) FILTER (WHERE pt.status = 'paid')::BIGINT as total_paid,
    CASE
      WHEN COALESCE(co.click_count, 0) > 0 THEN
        ROUND((COUNT(pt.id) FILTER (WHERE pt.status = 'paid')::NUMERIC / 
               co.click_count::NUMERIC) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM checkout_offers co
  LEFT JOIN pix_transactions pt ON pt.offer_id = co.id
  WHERE co.user_id = p_user_id
  GROUP BY co.id, co.click_count;
END;
$$;