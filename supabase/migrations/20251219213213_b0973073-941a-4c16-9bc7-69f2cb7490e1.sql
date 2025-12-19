-- 1) Remover triggers conflitantes que estavam sobrescrevendo daily_global_stats
DROP TRIGGER IF EXISTS trigger_global_pix_generated ON public.pix_transactions;
DROP TRIGGER IF EXISTS trigger_global_pix_status_change ON public.pix_transactions;

-- (Opcional/seguro) Remover funções antigas usadas apenas por esses triggers
DROP FUNCTION IF EXISTS public.trigger_global_pix_generated();
DROP FUNCTION IF EXISTS public.trigger_global_pix_status_change();

-- 2) Ajustar populate_daily_global_stats para alinhar com a lógica do dashboard:
--    - generated_* por data de criação
--    - paid_* e fees por data de pagamento (paid_at)
--    - expired_count por status=expired na data de criação (mantém compatibilidade)
CREATE OR REPLACE FUNCTION public.populate_daily_global_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.daily_global_stats;

  WITH dates AS (
    SELECT DISTINCT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS d
    FROM public.pix_transactions
    UNION
    SELECT DISTINCT (paid_at AT TIME ZONE 'America/Sao_Paulo')::date AS d
    FROM public.pix_transactions
    WHERE paid_at IS NOT NULL
  ),
  generated AS (
    SELECT
      (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS d,
      COUNT(*) AS generated_count,
      COALESCE(SUM(amount), 0) AS generated_amount
    FROM public.pix_transactions
    GROUP BY 1
  ),
  paid AS (
    SELECT
      (paid_at AT TIME ZONE 'America/Sao_Paulo')::date AS d,
      COUNT(*) AS paid_count,
      COALESCE(SUM(amount), 0) AS paid_amount,
      COALESCE(
        SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)),
        0
      ) AS total_fees
    FROM public.pix_transactions
    WHERE status = 'paid' AND paid_at IS NOT NULL
    GROUP BY 1
  ),
  expired AS (
    SELECT
      (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS d,
      COUNT(*) AS expired_count
    FROM public.pix_transactions
    WHERE status = 'expired'
    GROUP BY 1
  )
  INSERT INTO public.daily_global_stats (
    stat_date,
    generated_count,
    paid_count,
    expired_count,
    generated_amount,
    paid_amount,
    total_fees
  )
  SELECT
    dates.d,
    COALESCE(g.generated_count, 0),
    COALESCE(p.paid_count, 0),
    COALESCE(e.expired_count, 0),
    COALESCE(g.generated_amount, 0),
    COALESCE(p.paid_amount, 0),
    COALESCE(p.total_fees, 0)
  FROM dates
  LEFT JOIN generated g ON g.d = dates.d
  LEFT JOIN paid p ON p.d = dates.d
  LEFT JOIN expired e ON e.d = dates.d;
END;
$$;

-- 3) Corrigir os dados imediatamente (inclui o dia de hoje)
SELECT public.populate_daily_global_stats();