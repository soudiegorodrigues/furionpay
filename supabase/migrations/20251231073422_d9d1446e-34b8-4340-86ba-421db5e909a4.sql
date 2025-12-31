-- Adicionar coluna de contagem de cliques na tabela checkout_offers
ALTER TABLE checkout_offers 
ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;

-- Criar função RPC para incrementar cliques (segura contra race conditions)
CREATE OR REPLACE FUNCTION increment_offer_clicks(offer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE checkout_offers 
  SET click_count = click_count + 1,
      updated_at = NOW()
  WHERE id = offer_id;
END;
$$;

-- Permitir que qualquer pessoa possa chamar a função (checkout público)
GRANT EXECUTE ON FUNCTION increment_offer_clicks(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_offer_clicks(UUID) TO authenticated;