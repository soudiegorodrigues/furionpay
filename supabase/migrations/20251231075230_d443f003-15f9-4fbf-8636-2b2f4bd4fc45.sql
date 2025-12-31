-- Garantir que a função pode ser executada por usuários anônimos
GRANT EXECUTE ON FUNCTION increment_offer_clicks(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_offer_clicks(UUID) TO authenticated;