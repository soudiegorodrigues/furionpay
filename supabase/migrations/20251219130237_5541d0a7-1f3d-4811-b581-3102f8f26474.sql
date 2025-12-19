-- Tabela para armazenar status de saúde dos adquirentes (Health Check Proativo)
CREATE TABLE public.acquirer_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acquirer TEXT NOT NULL UNIQUE,
  is_healthy BOOLEAN DEFAULT true,
  last_check_at TIMESTAMPTZ DEFAULT now(),
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  consecutive_successes INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  last_error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir registros iniciais para cada adquirente
INSERT INTO public.acquirer_health_status (acquirer, is_healthy, avg_response_time_ms) VALUES 
  ('spedpay', true, 0),
  ('ativus', true, 0),
  ('valorion', true, 0),
  ('inter', true, 0);

-- Enable RLS
ALTER TABLE public.acquirer_health_status ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode ler (Edge Functions precisam acessar sem auth)
CREATE POLICY "Public read access to health status"
  ON public.acquirer_health_status
  FOR SELECT
  USING (true);

-- Política: Apenas service_role pode inserir/atualizar/deletar
CREATE POLICY "Service role can manage health status"
  ON public.acquirer_health_status
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Função para obter adquirentes saudáveis ordenados por tempo de resposta
CREATE OR REPLACE FUNCTION public.get_healthy_acquirers()
RETURNS TABLE(acquirer TEXT, avg_response_time_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT h.acquirer, h.avg_response_time_ms
  FROM public.acquirer_health_status h
  WHERE h.is_healthy = true
  ORDER BY h.avg_response_time_ms ASC NULLS LAST;
END;
$$;

-- Função para atualizar status de saúde de um adquirente
CREATE OR REPLACE FUNCTION public.update_acquirer_health(
  p_acquirer TEXT,
  p_is_healthy BOOLEAN,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_failures INTEGER;
  v_current_successes INTEGER;
BEGIN
  -- Buscar contadores atuais
  SELECT consecutive_failures, consecutive_successes 
  INTO v_current_failures, v_current_successes
  FROM public.acquirer_health_status 
  WHERE acquirer = p_acquirer;
  
  IF p_is_healthy THEN
    -- Sucesso: resetar falhas, incrementar sucessos
    UPDATE public.acquirer_health_status 
    SET 
      is_healthy = true,
      last_check_at = now(),
      last_success_at = now(),
      consecutive_failures = 0,
      consecutive_successes = COALESCE(v_current_successes, 0) + 1,
      avg_response_time_ms = COALESCE(p_response_time_ms, avg_response_time_ms),
      last_error_message = NULL,
      updated_at = now()
    WHERE acquirer = p_acquirer;
  ELSE
    -- Falha: incrementar falhas, marcar como não saudável após 2 falhas consecutivas
    UPDATE public.acquirer_health_status 
    SET 
      is_healthy = CASE WHEN COALESCE(v_current_failures, 0) >= 1 THEN false ELSE is_healthy END,
      last_check_at = now(),
      last_failure_at = now(),
      consecutive_failures = COALESCE(v_current_failures, 0) + 1,
      consecutive_successes = 0,
      last_error_message = p_error_message,
      updated_at = now()
    WHERE acquirer = p_acquirer;
  END IF;
END;
$$;

-- Índice para busca rápida por acquirer
CREATE INDEX idx_acquirer_health_status_acquirer ON public.acquirer_health_status(acquirer);

-- Índice para busca de saudáveis ordenados por tempo
CREATE INDEX idx_acquirer_health_status_healthy ON public.acquirer_health_status(is_healthy, avg_response_time_ms);