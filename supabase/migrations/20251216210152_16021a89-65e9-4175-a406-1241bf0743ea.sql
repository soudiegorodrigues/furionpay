-- Recreate generate_api_key function with correct search_path including extensions schema
CREATE OR REPLACE FUNCTION public.generate_api_key()
 RETURNS TABLE(api_key text, api_key_hash text, api_key_prefix text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_random_bytes BYTEA;
  v_key_body TEXT;
  v_full_key TEXT;
  v_hash TEXT;
  v_prefix TEXT;
BEGIN
  -- Gerar 24 bytes aleatórios
  v_random_bytes := gen_random_bytes(24);
  
  -- Converter para base64 e limpar caracteres especiais
  v_key_body := regexp_replace(encode(v_random_bytes, 'base64'), '[+/=]', '', 'g');
  v_key_body := substring(v_key_body from 1 for 32);
  
  -- Montar key completa
  v_full_key := 'fp_live_' || v_key_body;
  
  -- Gerar hash SHA-256
  v_hash := encode(sha256(v_full_key::bytea), 'hex');
  
  -- Gerar prefixo visível
  v_prefix := 'fp_live_' || substring(v_key_body from 1 for 8) || '...';
  
  RETURN QUERY SELECT v_full_key, v_hash, v_prefix;
END;
$function$;