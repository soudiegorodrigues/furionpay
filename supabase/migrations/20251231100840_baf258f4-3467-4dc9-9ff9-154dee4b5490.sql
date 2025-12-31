-- Etapa 1: Limpar triggers duplicados que causam contagem dupla
DROP TRIGGER IF EXISTS trg_pix_generated_stats ON pix_transactions;
DROP TRIGGER IF EXISTS trg_pix_status_change_stats ON pix_transactions;
DROP TRIGGER IF EXISTS trigger_pix_status_change_global_stats ON pix_transactions;

-- Etapa 2: Repopular a tabela de estatísticas globais com dados corretos
-- Limpar dados existentes
TRUNCATE TABLE daily_global_stats;

-- Recalcular baseado nas transações reais
INSERT INTO daily_global_stats (stat_date, generated_count, generated_amount, paid_count, paid_amount, expired_count, total_fees)
SELECT 
  (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE as stat_date,
  COUNT(*) as generated_count,
  COALESCE(SUM(amount), 0) as generated_amount,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_amount,
  COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
  COALESCE(SUM(
    CASE WHEN status = 'paid' THEN 
      COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)
    ELSE 0 END
  ), 0) as total_fees
FROM pix_transactions
GROUP BY (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE
ON CONFLICT (stat_date) DO UPDATE SET
  generated_count = EXCLUDED.generated_count,
  generated_amount = EXCLUDED.generated_amount,
  paid_count = EXCLUDED.paid_count,
  paid_amount = EXCLUDED.paid_amount,
  expired_count = EXCLUDED.expired_count,
  total_fees = EXCLUDED.total_fees,
  updated_at = NOW();