-- Remover a versão antiga da função request_withdrawal que causa ambiguidade
-- Esta versão tem 5 parâmetros e retorna uuid
-- A versão que permanece tem 6 parâmetros (com p_acquirer opcional) e retorna json

DROP FUNCTION IF EXISTS public.request_withdrawal(
  p_amount numeric, 
  p_bank_code text, 
  p_bank_name text, 
  p_pix_key_type text, 
  p_pix_key text
);