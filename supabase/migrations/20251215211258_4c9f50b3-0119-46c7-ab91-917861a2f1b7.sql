-- Tabela para armazenar métricas de performance
CREATE TABLE IF NOT EXISTS public.db_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_name TEXT NOT NULL,
  row_count BIGINT,
  index_scans BIGINT,
  sequential_scans BIGINT,
  dead_tuples BIGINT,
  table_size_bytes BIGINT
);

-- Índice para consultas por data
CREATE INDEX idx_db_metrics_collected_at ON public.db_performance_metrics(collected_at DESC);
CREATE INDEX idx_db_metrics_table_name ON public.db_performance_metrics(table_name);

-- Função para coletar métricas de performance
CREATE OR REPLACE FUNCTION public.collect_db_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.db_performance_metrics (table_name, row_count, index_scans, sequential_scans, dead_tuples, table_size_bytes)
  SELECT 
    relname,
    n_live_tup,
    idx_scan,
    seq_scan,
    n_dead_tup,
    pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND relname IN ('pix_transactions', 'admin_settings', 'profiles', 'withdrawal_requests', 'products', 'checkout_offers', 'api_monitoring_events', 'finance_transactions');
  
  -- Limpar métricas antigas (manter apenas últimos 90 dias)
  DELETE FROM public.db_performance_metrics 
  WHERE collected_at < now() - interval '90 days';
END;
$$;

-- Função para obter resumo de performance (para o admin)
CREATE OR REPLACE FUNCTION public.get_db_performance_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view performance metrics';
  END IF;

  SELECT json_build_object(
    'current_stats', (
      SELECT json_agg(json_build_object(
        'table_name', relname,
        'row_count', n_live_tup,
        'index_scans', idx_scan,
        'sequential_scans', seq_scan,
        'dead_tuples', n_dead_tup,
        'index_ratio', CASE WHEN (idx_scan + seq_scan) > 0 
          THEN ROUND((idx_scan::numeric / (idx_scan + seq_scan)) * 100, 1) 
          ELSE 0 END
      ))
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND relname IN ('pix_transactions', 'admin_settings', 'profiles', 'withdrawal_requests', 'products')
    ),
    'recommendations', (
      SELECT json_agg(json_build_object(
        'table_name', relname,
        'issue', 'Alto número de sequential scans',
        'seq_scans', seq_scan,
        'suggestion', 'Considerar índices adicionais ou cache'
      ))
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND seq_scan > idx_scan * 10
        AND seq_scan > 1000
    ),
    'cache_recommendation', (
      SELECT CASE 
        WHEN SUM(n_live_tup) > 10000 THEN 'Recomendado implementar cache'
        WHEN SUM(n_live_tup) > 5000 THEN 'Monitorar - cache pode ser útil em breve'
        ELSE 'Cache não necessário no momento'
      END
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND relname = 'pix_transactions'
    ),
    'total_transactions', (
      SELECT n_live_tup FROM pg_stat_user_tables 
      WHERE schemaname = 'public' AND relname = 'pix_transactions'
    ),
    'collected_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Agendar coleta diária às 04:00 (horário de Brasília = 07:00 UTC)
SELECT cron.schedule(
  'collect-db-metrics',
  '0 7 * * *',
  $$SELECT public.collect_db_performance_metrics()$$
);

-- Coletar métricas iniciais agora
SELECT public.collect_db_performance_metrics();