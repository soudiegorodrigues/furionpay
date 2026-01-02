-- Conceder permissão de execução para usuários anônimos e autenticados nas funções públicas do checkout
GRANT EXECUTE ON FUNCTION public.get_public_offer_by_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_checkout_config(UUID) TO anon, authenticated;