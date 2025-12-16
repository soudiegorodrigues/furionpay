-- =============================================
-- API PÚBLICA FURIONPAY - FASE 1
-- =============================================

-- Tabela api_clients - Gestão de API Keys
CREATE TABLE public.api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  total_requests BIGINT DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_api_clients_api_key_hash ON api_clients(api_key_hash);
CREATE INDEX idx_api_clients_api_key_prefix ON api_clients(api_key_prefix);
CREATE INDEX idx_api_clients_user_id ON api_clients(user_id);

-- RLS para api_clients
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API clients"
ON public.api_clients FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API clients"
ON public.api_clients FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API clients"
ON public.api_clients FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own API clients"
ON public.api_clients FOR DELETE
USING (user_id = auth.uid());

-- =============================================
-- Tabela api_requests - Logs de Requisições
-- =============================================
CREATE TABLE public.api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_client_id UUID REFERENCES api_clients(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  request_body JSONB,
  response_body JSONB,
  ip_address TEXT,
  user_agent TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para queries
CREATE INDEX idx_api_requests_client_id ON api_requests(api_client_id);
CREATE INDEX idx_api_requests_created_at ON api_requests(created_at);

-- RLS para api_requests
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API requests"
ON public.api_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM api_clients ac 
  WHERE ac.id = api_requests.api_client_id 
  AND ac.user_id = auth.uid()
));

-- Bloquear inserção/update/delete direta (apenas via edge functions)
CREATE POLICY "Block direct insert to api_requests"
ON public.api_requests FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct update to api_requests"
ON public.api_requests FOR UPDATE
USING (false);

CREATE POLICY "Block direct delete to api_requests"
ON public.api_requests FOR DELETE
USING (false);

-- =============================================
-- Tabela webhook_deliveries - Entregas de Webhooks
-- =============================================
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_client_id UUID REFERENCES api_clients(id) ON DELETE CASCADE,
  transaction_id UUID,
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);
CREATE INDEX idx_webhook_deliveries_client_id ON webhook_deliveries(api_client_id);

-- RLS para webhook_deliveries
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhook deliveries"
ON public.webhook_deliveries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM api_clients ac 
  WHERE ac.id = webhook_deliveries.api_client_id 
  AND ac.user_id = auth.uid()
));

-- Bloquear acesso direto (apenas via edge functions)
CREATE POLICY "Block direct insert to webhook_deliveries"
ON public.webhook_deliveries FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct update to webhook_deliveries"
ON public.webhook_deliveries FOR UPDATE
USING (false);

CREATE POLICY "Block direct delete to webhook_deliveries"
ON public.webhook_deliveries FOR DELETE
USING (false);

-- =============================================
-- Função para gerar API key
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TABLE(api_key TEXT, api_key_hash TEXT, api_key_prefix TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- =============================================
-- Função para criar API client
-- =============================================
CREATE OR REPLACE FUNCTION public.create_api_client(
  p_name TEXT,
  p_webhook_url TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  api_key TEXT,
  api_key_prefix TEXT,
  name TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_data RECORD;
  v_client_id UUID;
  v_webhook_secret TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Gerar API key
  SELECT * INTO v_key_data FROM generate_api_key();
  
  -- Gerar webhook secret
  v_webhook_secret := encode(gen_random_bytes(32), 'hex');
  
  -- Inserir cliente
  INSERT INTO api_clients (user_id, name, api_key_hash, api_key_prefix, webhook_url, webhook_secret)
  VALUES (auth.uid(), p_name, v_key_data.api_key_hash, v_key_data.api_key_prefix, p_webhook_url, v_webhook_secret)
  RETURNING api_clients.id INTO v_client_id;
  
  RETURN QUERY
  SELECT 
    v_client_id,
    v_key_data.api_key,
    v_key_data.api_key_prefix,
    p_name,
    p_webhook_url,
    now();
END;
$$;

-- =============================================
-- Função para validar API key (usada pelas edge functions)
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_api_key(p_api_key TEXT)
RETURNS TABLE(
  client_id UUID,
  user_id UUID,
  client_name TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  rate_limit INTEGER,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- Validar formato
  IF p_api_key IS NULL OR NOT p_api_key LIKE 'fp_live_%' THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER, false;
    RETURN;
  END IF;
  
  -- Calcular hash
  v_hash := encode(sha256(p_api_key::bytea), 'hex');
  
  -- Buscar cliente
  RETURN QUERY
  SELECT 
    ac.id,
    ac.user_id,
    ac.name,
    ac.webhook_url,
    ac.webhook_secret,
    ac.rate_limit_per_minute,
    ac.is_active
  FROM api_clients ac
  WHERE ac.api_key_hash = v_hash
  LIMIT 1;
END;
$$;

-- =============================================
-- Função para listar API clients do usuário
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_api_clients()
RETURNS TABLE(
  id UUID,
  name TEXT,
  api_key_prefix TEXT,
  webhook_url TEXT,
  is_active BOOLEAN,
  rate_limit_per_minute INTEGER,
  total_requests BIGINT,
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    ac.id,
    ac.name,
    ac.api_key_prefix,
    ac.webhook_url,
    ac.is_active,
    ac.rate_limit_per_minute,
    ac.total_requests,
    ac.last_request_at,
    ac.created_at
  FROM api_clients ac
  WHERE ac.user_id = auth.uid()
  ORDER BY ac.created_at DESC;
END;
$$;

-- =============================================
-- Função para atualizar API client
-- =============================================
CREATE OR REPLACE FUNCTION public.update_api_client(
  p_client_id UUID,
  p_name TEXT DEFAULT NULL,
  p_webhook_url TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  UPDATE api_clients
  SET
    name = COALESCE(p_name, name),
    webhook_url = COALESCE(p_webhook_url, webhook_url),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_client_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- =============================================
-- Função para deletar API client
-- =============================================
CREATE OR REPLACE FUNCTION public.delete_api_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM api_clients
  WHERE id = p_client_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- =============================================
-- Função para regenerar webhook secret
-- =============================================
CREATE OR REPLACE FUNCTION public.regenerate_webhook_secret(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_secret TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  v_new_secret := encode(gen_random_bytes(32), 'hex');
  
  UPDATE api_clients
  SET webhook_secret = v_new_secret, updated_at = now()
  WHERE id = p_client_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'API client not found';
  END IF;
  
  RETURN v_new_secret;
END;
$$;

-- =============================================
-- Função para obter webhook secret (apenas para o dono)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_webhook_secret(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT webhook_secret INTO v_secret
  FROM api_clients
  WHERE id = p_client_id AND user_id = auth.uid();
  
  RETURN v_secret;
END;
$$;

-- =============================================
-- Função para obter estatísticas de API requests
-- =============================================
CREATE OR REPLACE FUNCTION public.get_api_client_stats(p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verificar se o cliente pertence ao usuário
  IF NOT EXISTS (SELECT 1 FROM api_clients WHERE id = p_client_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'API client not found';
  END IF;
  
  SELECT json_build_object(
    'total_requests', (SELECT COUNT(*) FROM api_requests WHERE api_client_id = p_client_id),
    'requests_today', (SELECT COUNT(*) FROM api_requests WHERE api_client_id = p_client_id AND created_at >= CURRENT_DATE),
    'requests_last_7_days', (SELECT COUNT(*) FROM api_requests WHERE api_client_id = p_client_id AND created_at >= now() - interval '7 days'),
    'success_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
      )
      FROM api_requests WHERE api_client_id = p_client_id
    ),
    'avg_response_time_ms', (SELECT ROUND(AVG(response_time_ms)) FROM api_requests WHERE api_client_id = p_client_id),
    'webhook_deliveries', (SELECT COUNT(*) FROM webhook_deliveries WHERE api_client_id = p_client_id),
    'webhook_success_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100, 1
      )
      FROM webhook_deliveries WHERE api_client_id = p_client_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;