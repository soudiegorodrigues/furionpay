
-- ============================================
-- FASE 1: OTIMIZAÇÃO DE PERFORMANCE
-- Criação de estruturas NOVAS sem modificar existentes
-- ============================================

-- 1. Tabela de estatísticas diárias agregadas
CREATE TABLE public.daily_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stat_date DATE NOT NULL,
  generated_count INTEGER DEFAULT 0,
  paid_count INTEGER DEFAULT 0,
  expired_count INTEGER DEFAULT 0,
  generated_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  total_fees NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stat_date)
);

-- Índices otimizados para consultas
CREATE INDEX idx_daily_stats_user_date ON public.daily_user_stats(user_id, stat_date DESC);
CREATE INDEX idx_daily_stats_date ON public.daily_user_stats(stat_date DESC);

-- Enable RLS
ALTER TABLE public.daily_user_stats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own stats"
ON public.daily_user_stats FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all stats"
ON public.daily_user_stats FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Bloquear acesso direto de escrita (apenas via triggers)
CREATE POLICY "Block direct insert"
ON public.daily_user_stats FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct update"
ON public.daily_user_stats FOR UPDATE
USING (false);

CREATE POLICY "Block direct delete"
ON public.daily_user_stats FOR DELETE
USING (false);

-- 2. Função auxiliar para atualizar estatísticas
CREATE OR REPLACE FUNCTION public.update_daily_user_stats(
  p_user_id UUID,
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
  INSERT INTO public.daily_user_stats (
    user_id, stat_date, generated_count, paid_count, expired_count,
    generated_amount, paid_amount, total_fees
  ) VALUES (
    p_user_id, p_date, p_generated_count, p_paid_count, p_expired_count,
    p_generated_amount, p_paid_amount, p_fees
  )
  ON CONFLICT (user_id, stat_date) DO UPDATE SET
    generated_count = daily_user_stats.generated_count + EXCLUDED.generated_count,
    paid_count = daily_user_stats.paid_count + EXCLUDED.paid_count,
    expired_count = daily_user_stats.expired_count + EXCLUDED.expired_count,
    generated_amount = daily_user_stats.generated_amount + EXCLUDED.generated_amount,
    paid_amount = daily_user_stats.paid_amount + EXCLUDED.paid_amount,
    total_fees = daily_user_stats.total_fees + EXCLUDED.total_fees,
    updated_at = NOW();
END;
$$;

-- 3. Trigger para PIX gerado
CREATE OR REPLACE FUNCTION public.trigger_pix_generated_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date DATE;
BEGIN
  -- Só processar se tem user_id
  IF NEW.user_id IS NOT NULL THEN
    v_date := (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE;
    
    PERFORM public.update_daily_user_stats(
      NEW.user_id,
      v_date,
      1,  -- generated_count
      0,  -- paid_count
      0,  -- expired_count
      NEW.amount,  -- generated_amount
      0,  -- paid_amount
      0   -- fees
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Trigger para PIX pago ou expirado
CREATE OR REPLACE FUNCTION public.trigger_pix_status_change_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date DATE;
  v_fee NUMERIC;
BEGIN
  -- Só processar se tem user_id e status mudou
  IF NEW.user_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- PIX foi PAGO
    IF NEW.status = 'paid' AND OLD.status = 'generated' THEN
      v_date := COALESCE(
        (NEW.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE,
        (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
      );
      
      -- Calcular taxa
      v_fee := COALESCE(
        (NEW.amount * COALESCE(NEW.fee_percentage, 0) / 100) + COALESCE(NEW.fee_fixed, 0),
        0
      );
      
      PERFORM public.update_daily_user_stats(
        NEW.user_id,
        v_date,
        0,  -- generated_count
        1,  -- paid_count
        0,  -- expired_count
        0,  -- generated_amount
        NEW.amount,  -- paid_amount
        v_fee  -- fees
      );
    
    -- PIX EXPIROU
    ELSIF NEW.status = 'expired' AND OLD.status = 'generated' THEN
      v_date := (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE;
      
      PERFORM public.update_daily_user_stats(
        NEW.user_id,
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

-- 5. Criar triggers na tabela pix_transactions
CREATE TRIGGER trg_pix_generated_stats
AFTER INSERT ON public.pix_transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_pix_generated_stats();

CREATE TRIGGER trg_pix_status_change_stats
AFTER UPDATE ON public.pix_transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_pix_status_change_stats();

-- 6. Popular dados históricos (backfill)
INSERT INTO public.daily_user_stats (
  user_id, stat_date, generated_count, paid_count, expired_count,
  generated_amount, paid_amount, total_fees
)
SELECT 
  user_id,
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
FROM public.pix_transactions
WHERE user_id IS NOT NULL
GROUP BY user_id, (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE
ON CONFLICT (user_id, stat_date) DO NOTHING;

-- 7. Nova função get_user_dashboard_v2 (otimizada)
CREATE OR REPLACE FUNCTION public.get_user_dashboard_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_brazil_month_start DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Data atual no Brasil
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_brazil_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  -- Buscar estatísticas agregadas (muito mais rápido!)
  SELECT json_build_object(
    'total_generated', COALESCE(SUM(generated_count), 0),
    'total_paid', COALESCE(SUM(paid_count), 0),
    'total_expired', COALESCE(SUM(expired_count), 0),
    'total_amount_generated', COALESCE(SUM(generated_amount), 0),
    'total_amount_paid', ROUND(COALESCE(SUM(paid_amount), 0) - COALESCE(SUM(total_fees), 0), 2),
    'today_generated', COALESCE(SUM(generated_count) FILTER (WHERE stat_date = v_brazil_today), 0),
    'today_paid', COALESCE(SUM(paid_count) FILTER (WHERE stat_date = v_brazil_today), 0),
    'today_amount_paid', ROUND(
      COALESCE(SUM(paid_amount) FILTER (WHERE stat_date = v_brazil_today), 0) - 
      COALESCE(SUM(total_fees) FILTER (WHERE stat_date = v_brazil_today), 0), 
      2
    ),
    'month_paid', COALESCE(SUM(paid_count) FILTER (WHERE stat_date >= v_brazil_month_start), 0),
    'month_amount_paid', ROUND(
      COALESCE(SUM(paid_amount) FILTER (WHERE stat_date >= v_brazil_month_start), 0) - 
      COALESCE(SUM(total_fees) FILTER (WHERE stat_date >= v_brazil_month_start), 0), 
      2
    ),
    'total_fees', ROUND(COALESCE(SUM(total_fees), 0), 2),
    'today_fees', ROUND(COALESCE(SUM(total_fees) FILTER (WHERE stat_date = v_brazil_today), 0), 2)
  ) INTO v_result
  FROM public.daily_user_stats
  WHERE user_id = auth.uid();
  
  -- Se não tem dados ainda, retornar zeros
  IF v_result IS NULL THEN
    v_result := json_build_object(
      'total_generated', 0,
      'total_paid', 0,
      'total_expired', 0,
      'total_amount_generated', 0,
      'total_amount_paid', 0,
      'today_generated', 0,
      'today_paid', 0,
      'today_amount_paid', 0,
      'month_paid', 0,
      'month_amount_paid', 0,
      'total_fees', 0,
      'today_fees', 0
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- 8. Função de verificação para comparar v1 vs v2 (para testes)
CREATE OR REPLACE FUNCTION public.compare_dashboard_functions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old JSON;
  v_new JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Chamar função antiga
  v_old := public.get_user_dashboard();
  
  -- Chamar função nova
  v_new := public.get_user_dashboard_v2();
  
  RETURN json_build_object(
    'v1_result', v_old,
    'v2_result', v_new,
    'match', (
      (v_old->>'total_generated')::integer = (v_new->>'total_generated')::integer AND
      (v_old->>'total_paid')::integer = (v_new->>'total_paid')::integer AND
      ABS((v_old->>'total_amount_paid')::numeric - (v_new->>'total_amount_paid')::numeric) < 1
    )
  );
END;
$$;
