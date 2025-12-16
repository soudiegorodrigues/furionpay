-- Criar tabela para registrar eventos de rate limit
CREATE TABLE public.rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL,
  ip_address TEXT,
  event_type TEXT NOT NULL, -- 'blocked', 'cooldown'
  reason TEXT,
  unpaid_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consultas por data
CREATE INDEX idx_rate_limit_events_created_at ON public.rate_limit_events(created_at DESC);

-- RLS - apenas admins podem ver
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limit events"
ON public.rate_limit_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Função para dados do gráfico
CREATE OR REPLACE FUNCTION public.get_rate_limit_chart_data(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  date TEXT,
  blocks BIGINT,
  cooldowns BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM') as date,
    COUNT(*) FILTER (WHERE event_type = 'blocked') as blocks,
    COUNT(*) FILTER (WHERE event_type = 'cooldown') as cooldowns
  FROM rate_limit_events
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD'), 
           TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
  ORDER BY TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');
$$;

-- Permissão para executar
GRANT EXECUTE ON FUNCTION public.get_rate_limit_chart_data(INTEGER) TO authenticated;

-- Limpeza automática de eventos antigos (manter 90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_events WHERE created_at < now() - interval '90 days';
END;
$$;