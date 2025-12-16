-- Fix create_api_client search_path so pgcrypto functions (gen_random_bytes) resolve correctly
CREATE OR REPLACE FUNCTION public.create_api_client(p_name text, p_webhook_url text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, api_key text, api_key_prefix text, name text, webhook_url text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key_data RECORD;
  v_client_id UUID;
  v_webhook_secret TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Gerar API key
  SELECT * INTO v_key_data FROM public.generate_api_key();

  -- Gerar webhook secret
  v_webhook_secret := encode(extensions.gen_random_bytes(32), 'hex');

  -- Inserir cliente
  INSERT INTO public.api_clients (user_id, name, api_key_hash, api_key_prefix, webhook_url, webhook_secret)
  VALUES (auth.uid(), p_name, v_key_data.api_key_hash, v_key_data.api_key_prefix, p_webhook_url, v_webhook_secret)
  RETURNING public.api_clients.id INTO v_client_id;

  RETURN QUERY
  SELECT 
    v_client_id,
    v_key_data.api_key,
    v_key_data.api_key_prefix,
    p_name,
    p_webhook_url,
    now();
END;
$function$;