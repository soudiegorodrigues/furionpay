-- Corrigir search_path da função para segurança
DROP FUNCTION IF EXISTS public.update_daily_global_stats(DATE, INTEGER, INTEGER, INTEGER, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_daily_global_stats(
  p_date DATE,
  p_generated_count INTEGER,
  p_paid_count INTEGER,
  p_expired_count INTEGER,
  p_generated_amount NUMERIC,
  p_paid_amount NUMERIC,
  p_fees NUMERIC
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.daily_global_stats (
    stat_date, generated_count, paid_count, expired_count,
    generated_amount, paid_amount, total_fees
  ) VALUES (
    p_date, p_generated_count, p_paid_count, p_expired_count,
    p_generated_amount, p_paid_amount, p_fees
  )
  ON CONFLICT (stat_date) DO UPDATE SET
    generated_count = EXCLUDED.generated_count,
    paid_count = EXCLUDED.paid_count,
    expired_count = EXCLUDED.expired_count,
    generated_amount = EXCLUDED.generated_amount,
    paid_amount = EXCLUDED.paid_amount,
    total_fees = EXCLUDED.total_fees,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;