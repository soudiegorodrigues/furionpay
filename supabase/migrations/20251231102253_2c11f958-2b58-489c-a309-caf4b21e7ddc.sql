-- Etapa 1: Recriar trigger para daily_user_stats
CREATE TRIGGER trg_pix_user_stats_update
AFTER UPDATE ON pix_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_pix_status_change_stats();

-- Etapa 2: Funcao para repopular daily_user_stats
CREATE OR REPLACE FUNCTION populate_daily_user_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE daily_user_stats;
  
  INSERT INTO daily_user_stats (
    user_id, stat_date, generated_count, generated_amount, 
    paid_count, paid_amount, expired_count, total_fees
  )
  SELECT 
    user_id,
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
  WHERE user_id IS NOT NULL
  GROUP BY user_id, (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE
  ON CONFLICT (user_id, stat_date) DO UPDATE SET
    generated_count = EXCLUDED.generated_count,
    generated_amount = EXCLUDED.generated_amount,
    paid_count = EXCLUDED.paid_count,
    paid_amount = EXCLUDED.paid_amount,
    expired_count = EXCLUDED.expired_count,
    total_fees = EXCLUDED.total_fees,
    updated_at = NOW();
END;
$$;

-- Etapa 3: Executar repopulacao
SELECT populate_daily_user_stats();