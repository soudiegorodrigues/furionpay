-- ============================================
-- OTIMIZAÇÕES PARA 100K PIX/DIA
-- ============================================

-- 1. Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_api_monitoring_events_optimized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deleta eventos com mais de 7 dias (em batches para evitar lock)
  WITH deleted AS (
    DELETE FROM api_monitoring_events
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND id IN (
      SELECT id FROM api_monitoring_events
      WHERE created_at < NOW() - INTERVAL '7 days'
      LIMIT 10000
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RAISE NOTICE 'Cleaned up % old monitoring events', deleted_count;
END;
$$;

-- 2. Índice parcial otimizado para PIX pendentes (muito mais eficiente)
DROP INDEX IF EXISTS idx_pix_pending_fast;
CREATE INDEX idx_pix_pending_fast ON pix_transactions(created_at DESC) 
WHERE status = 'generated' AND txid IS NOT NULL;

-- 3. Índice para limpeza de logs por data
DROP INDEX IF EXISTS idx_api_monitoring_created;
CREATE INDEX idx_api_monitoring_created ON api_monitoring_events(created_at);

-- 4. Índice para rate_limit_events por data (limpeza)
DROP INDEX IF EXISTS idx_rate_limit_events_created;
CREATE INDEX idx_rate_limit_events_created ON rate_limit_events(created_at);

-- 5. Função otimizada para limpeza de rate_limit_events
CREATE OR REPLACE FUNCTION cleanup_rate_limit_events_optimized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM rate_limit_events
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND id IN (
      SELECT id FROM rate_limit_events
      WHERE created_at < NOW() - INTERVAL '7 days'
      LIMIT 10000
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RAISE NOTICE 'Cleaned up % old rate limit events', deleted_count;
END;
$$;

-- 6. Atualizar cron do health check para cada 5 minutos
SELECT cron.unschedule('health-check-acquirers');

SELECT cron.schedule(
  'health-check-acquirers',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qtlhwjotfkyyqzgxlmkg.supabase.co/functions/v1/health-check-acquirers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bGh3am90Zmt5eXF6Z3hsbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzg0NTYsImV4cCI6MjA4MDcxNDQ1Nn0.ZvhXJYReYFdJlFTmHfY1lKcdGA2f9siWePRr8UPMl5I"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 7. Cron job para limpeza diária às 3h da manhã
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 3 * * *',
  $$
  SELECT cleanup_api_monitoring_events_optimized();
  SELECT cleanup_rate_limit_events_optimized();
  $$
);