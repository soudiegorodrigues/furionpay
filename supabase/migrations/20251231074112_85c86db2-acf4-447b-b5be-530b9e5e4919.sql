-- Tabela para registrar cada clique individualmente
CREATE TABLE offer_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES checkout_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance em queries temporais
CREATE INDEX idx_offer_clicks_offer_id ON offer_clicks(offer_id);
CREATE INDEX idx_offer_clicks_user_id ON offer_clicks(user_id);
CREATE INDEX idx_offer_clicks_date ON offer_clicks(clicked_at DESC);

-- RLS para segurança
ALTER TABLE offer_clicks ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê cliques de suas próprias ofertas
CREATE POLICY "Users can view clicks on their offers"
  ON offer_clicks FOR SELECT
  USING (user_id = auth.uid());

-- Política: insert público (via RPC)
CREATE POLICY "Public can insert clicks"
  ON offer_clicks FOR INSERT
  WITH CHECK (true);

-- Atualizar a função de incremento para também registrar na nova tabela
CREATE OR REPLACE FUNCTION increment_offer_clicks(offer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offer_owner UUID;
BEGIN
  -- Buscar o owner da oferta
  SELECT user_id INTO offer_owner FROM checkout_offers WHERE id = offer_id;
  
  -- Incrementar contador (mantém compatibilidade)
  UPDATE checkout_offers 
  SET click_count = click_count + 1, updated_at = NOW()
  WHERE id = offer_id;
  
  -- Registrar clique individual para histórico
  INSERT INTO offer_clicks (offer_id, user_id, clicked_at)
  VALUES (offer_id, offer_owner, NOW());
END;
$$;

-- Função RPC para buscar dados do gráfico
CREATE OR REPLACE FUNCTION get_offer_clicks_chart(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  clicks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(oc.clicked_at) as date,
    COUNT(*)::BIGINT as clicks
  FROM offer_clicks oc
  WHERE oc.user_id = p_user_id
    AND oc.clicked_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(oc.clicked_at)
  ORDER BY date ASC;
END;
$$;