
-- =====================================================
-- FASE 1: LIMPEZA AUTOMÁTICA DE LOGS (api_monitoring_events)
-- =====================================================

-- Função para limpar eventos antigos (manter apenas 7 dias)
CREATE OR REPLACE FUNCTION public.cleanup_api_monitoring_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM api_monitoring_events 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE LOG '[CLEANUP] Deleted % old api_monitoring_events', v_deleted_count;
END;
$$;

-- Função para limpar rate_limit_events antigos (manter apenas 7 dias)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_events 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE LOG '[CLEANUP] Deleted % old rate_limit_events', v_deleted_count;
END;
$$;

-- =====================================================
-- FASE 2: TABELA AGREGADA PARA STATS GLOBAIS
-- =====================================================

-- Criar tabela para estatísticas globais diárias
CREATE TABLE IF NOT EXISTS public.daily_global_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_date DATE NOT NULL UNIQUE,
  generated_count INTEGER DEFAULT 0,
  paid_count INTEGER DEFAULT 0,
  expired_count INTEGER DEFAULT 0,
  generated_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  total_fees NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por data
CREATE INDEX IF NOT EXISTS idx_daily_global_stats_date ON daily_global_stats(stat_date DESC);

-- Enable RLS
ALTER TABLE public.daily_global_stats ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver stats globais
CREATE POLICY "Admins can view global stats"
ON public.daily_global_stats
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Bloquear acesso direto de escrita (apenas via triggers/functions)
CREATE POLICY "Block direct insert"
ON public.daily_global_stats
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct update"
ON public.daily_global_stats
FOR UPDATE
USING (false);

CREATE POLICY "Block direct delete"
ON public.daily_global_stats
FOR DELETE
USING (false);

-- Função para atualizar stats globais
CREATE OR REPLACE FUNCTION public.update_daily_global_stats(
  p_date DATE,
  p_generated_count INTEGER DEFAULT 0,
  p_paid_count INTEGER DEFAULT 0,
  p_expired_count INTEGER DEFAULT 0,
  p_generated_amount NUMERIC DEFAULT 0,
  p_paid_amount NUMERIC DEFAULT 0,
  p_fees NUMERIC DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.daily_global_stats (
    stat_date, generated_count, paid_count, expired_count,
    generated_amount, paid_amount, total_fees
  ) VALUES (
    p_date, p_generated_count, p_paid_count, p_expired_count,
    p_generated_amount, p_paid_amount, p_fees
  )
  ON CONFLICT (stat_date) DO UPDATE SET
    generated_count = daily_global_stats.generated_count + EXCLUDED.generated_count,
    paid_count = daily_global_stats.paid_count + EXCLUDED.paid_count,
    expired_count = daily_global_stats.expired_count + EXCLUDED.expired_count,
    generated_amount = daily_global_stats.generated_amount + EXCLUDED.generated_amount,
    paid_amount = daily_global_stats.paid_amount + EXCLUDED.paid_amount,
    total_fees = daily_global_stats.total_fees + EXCLUDED.total_fees,
    updated_at = NOW();
END;
$$;

-- Trigger para atualizar stats globais quando PIX é gerado
CREATE OR REPLACE FUNCTION public.trigger_global_pix_generated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date DATE;
BEGIN
  v_date := (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  PERFORM public.update_daily_global_stats(
    v_date,
    1,  -- generated_count
    0,  -- paid_count
    0,  -- expired_count
    NEW.amount,  -- generated_amount
    0,  -- paid_amount
    0   -- fees
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para atualizar stats globais quando status muda
CREATE OR REPLACE FUNCTION public.trigger_global_pix_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date DATE;
  v_fee NUMERIC;
BEGIN
  -- Só processa se status mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Quando muda para paid
    IF NEW.status = 'paid' AND OLD.status = 'generated' THEN
      v_date := (COALESCE(NEW.paid_at, NOW()) AT TIME ZONE 'America/Sao_Paulo')::DATE;
      
      -- Calcular taxa
      v_fee := COALESCE(
        (NEW.amount * COALESCE(NEW.fee_percentage, 0) / 100) + COALESCE(NEW.fee_fixed, 0),
        0
      );
      
      PERFORM public.update_daily_global_stats(
        v_date,
        0,  -- generated_count
        1,  -- paid_count
        0,  -- expired_count
        0,  -- generated_amount
        NEW.amount,  -- paid_amount
        v_fee  -- fees
      );
    -- Quando muda para expired
    ELSIF NEW.status = 'expired' AND OLD.status = 'generated' THEN
      v_date := (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE;
      
      PERFORM public.update_daily_global_stats(
        v_date,
        0,  -- generated_count
        0,  -- paid_count
        1,  -- expired_count
        0,  -- generated_amount
        0,  -- paid_amount
        0   -- fees
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar triggers (verificar se já existem)
DROP TRIGGER IF EXISTS trigger_global_pix_generated ON pix_transactions;
CREATE TRIGGER trigger_global_pix_generated
AFTER INSERT ON pix_transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_global_pix_generated();

DROP TRIGGER IF EXISTS trigger_global_pix_status_change ON pix_transactions;
CREATE TRIGGER trigger_global_pix_status_change
AFTER UPDATE ON pix_transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_global_pix_status_change();

-- =====================================================
-- RPC OTIMIZADA PARA DASHBOARD GLOBAL
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_global_dashboard_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_brazil_month_start DATE;
  v_totals RECORD;
  v_today RECORD;
  v_month RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view global dashboard';
  END IF;
  
  -- Datas em timezone Brasil
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_brazil_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  -- Totais históricos (da tabela agregada)
  SELECT 
    COALESCE(SUM(generated_count), 0) as total_generated,
    COALESCE(SUM(paid_count), 0) as total_paid,
    COALESCE(SUM(expired_count), 0) as total_expired,
    COALESCE(SUM(generated_amount), 0) as total_amount_generated,
    COALESCE(SUM(paid_amount), 0) as total_amount_paid,
    COALESCE(SUM(total_fees), 0) as total_fees
  INTO v_totals
  FROM daily_global_stats;
  
  -- Stats de hoje
  SELECT 
    COALESCE(generated_count, 0) as today_generated,
    COALESCE(paid_count, 0) as today_paid,
    COALESCE(paid_amount, 0) as today_amount_paid,
    COALESCE(total_fees, 0) as today_fees
  INTO v_today
  FROM daily_global_stats
  WHERE stat_date = v_brazil_today;
  
  -- Stats do mês
  SELECT 
    COALESCE(SUM(paid_count), 0) as month_paid,
    COALESCE(SUM(paid_amount), 0) as month_amount_paid,
    COALESCE(SUM(total_fees), 0) as month_fees
  INTO v_month
  FROM daily_global_stats
  WHERE stat_date >= v_brazil_month_start;
  
  SELECT json_build_object(
    'total_generated', COALESCE(v_totals.total_generated, 0),
    'total_paid', COALESCE(v_totals.total_paid, 0),
    'total_expired', COALESCE(v_totals.total_expired, 0),
    'total_amount_generated', COALESCE(v_totals.total_amount_generated, 0),
    'total_amount_paid', COALESCE(v_totals.total_amount_paid, 0),
    'total_fees', COALESCE(v_totals.total_fees, 0),
    'today_generated', COALESCE(v_today.today_generated, 0),
    'today_paid', COALESCE(v_today.today_paid, 0),
    'today_amount_paid', COALESCE(v_today.today_amount_paid, 0),
    'today_fees', COALESCE(v_today.today_fees, 0),
    'month_paid', COALESCE(v_month.month_paid, 0),
    'month_amount_paid', COALESCE(v_month.month_amount_paid, 0),
    'month_fees', COALESCE(v_month.month_fees, 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- FUNÇÃO PARA POPULAR DADOS HISTÓRICOS
-- =====================================================

CREATE OR REPLACE FUNCTION public.populate_daily_global_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Limpar dados existentes para repopular
  DELETE FROM daily_global_stats;
  
  -- Popular com dados históricos agregados
  INSERT INTO daily_global_stats (stat_date, generated_count, paid_count, expired_count, generated_amount, paid_amount, total_fees)
  SELECT 
    (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE as stat_date,
    COUNT(*) as generated_count,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
    SUM(amount) as generated_amount,
    SUM(amount) FILTER (WHERE status = 'paid') as paid_amount,
    SUM(
      CASE WHEN status = 'paid' THEN
        (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
      ELSE 0 END
    ) as total_fees
  FROM pix_transactions
  GROUP BY (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE
  ON CONFLICT (stat_date) DO UPDATE SET
    generated_count = EXCLUDED.generated_count,
    paid_count = EXCLUDED.paid_count,
    expired_count = EXCLUDED.expired_count,
    generated_amount = EXCLUDED.generated_amount,
    paid_amount = EXCLUDED.paid_amount,
    total_fees = EXCLUDED.total_fees,
    updated_at = NOW();
END;
$$;

-- Executar população inicial
SELECT public.populate_daily_global_stats();

-- Executar limpeza inicial de logs antigos
SELECT public.cleanup_api_monitoring_events();
SELECT public.cleanup_rate_limit_events();
