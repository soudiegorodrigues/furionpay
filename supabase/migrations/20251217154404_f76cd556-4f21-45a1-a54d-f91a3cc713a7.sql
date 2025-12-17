-- Trigger function to update daily_global_stats on PIX generation
CREATE OR REPLACE FUNCTION public.trigger_pix_generated_global_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
BEGIN
  v_date := (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  INSERT INTO public.daily_global_stats (stat_date, generated_count, generated_amount)
  VALUES (v_date, 1, NEW.amount)
  ON CONFLICT (stat_date) DO UPDATE SET
    generated_count = daily_global_stats.generated_count + 1,
    generated_amount = daily_global_stats.generated_amount + EXCLUDED.generated_amount,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger function to update daily_global_stats on PIX status change
CREATE OR REPLACE FUNCTION public.trigger_pix_status_change_global_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_fee NUMERIC;
BEGIN
  -- Handle status change to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    v_date := (COALESCE(NEW.paid_at, NOW()) AT TIME ZONE 'America/Sao_Paulo')::DATE;
    
    -- Calculate fee
    v_fee := COALESCE(
      (NEW.amount * COALESCE(NEW.fee_percentage, 0) / 100) + COALESCE(NEW.fee_fixed, 0),
      0
    );
    
    INSERT INTO public.daily_global_stats (stat_date, paid_count, paid_amount, total_fees)
    VALUES (v_date, 1, NEW.amount, v_fee)
    ON CONFLICT (stat_date) DO UPDATE SET
      paid_count = daily_global_stats.paid_count + 1,
      paid_amount = daily_global_stats.paid_amount + EXCLUDED.paid_amount,
      total_fees = daily_global_stats.total_fees + EXCLUDED.total_fees,
      updated_at = NOW();
  END IF;
  
  -- Handle status change to 'expired'
  IF NEW.status = 'expired' AND (OLD.status IS NULL OR OLD.status != 'expired') THEN
    v_date := (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE;
    
    INSERT INTO public.daily_global_stats (stat_date, expired_count)
    VALUES (v_date, 1)
    ON CONFLICT (stat_date) DO UPDATE SET
      expired_count = daily_global_stats.expired_count + 1,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers on pix_transactions for global stats
DROP TRIGGER IF EXISTS trigger_global_stats_on_insert ON pix_transactions;
CREATE TRIGGER trigger_global_stats_on_insert
  AFTER INSERT ON pix_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_pix_generated_global_stats();

DROP TRIGGER IF EXISTS trigger_global_stats_on_update ON pix_transactions;
CREATE TRIGGER trigger_global_stats_on_update
  AFTER UPDATE ON pix_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_pix_status_change_global_stats();

-- Optimized admin dashboard function using daily_global_stats
CREATE OR REPLACE FUNCTION public.get_pix_dashboard_auth_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_brazil_month_start DATE;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current date in Brazil timezone
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_brazil_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  SELECT json_build_object(
    'total_generated', COALESCE((SELECT SUM(generated_count) FROM daily_global_stats), 0),
    'total_paid', COALESCE((SELECT SUM(paid_count) FROM daily_global_stats), 0),
    'total_expired', COALESCE((SELECT SUM(expired_count) FROM daily_global_stats), 0),
    'total_amount_generated', COALESCE((SELECT SUM(generated_amount) FROM daily_global_stats), 0),
    'total_amount_paid', COALESCE((SELECT SUM(paid_amount) FROM daily_global_stats), 0),
    'today_generated', COALESCE((SELECT generated_count FROM daily_global_stats WHERE stat_date = v_brazil_today), 0),
    'today_paid', COALESCE((SELECT paid_count FROM daily_global_stats WHERE stat_date = v_brazil_today), 0),
    'today_amount_paid', COALESCE((SELECT paid_amount FROM daily_global_stats WHERE stat_date = v_brazil_today), 0),
    'month_generated', COALESCE((SELECT SUM(generated_count) FROM daily_global_stats WHERE stat_date >= v_brazil_month_start), 0),
    'month_paid', COALESCE((SELECT SUM(paid_count) FROM daily_global_stats WHERE stat_date >= v_brazil_month_start), 0),
    'month_amount_paid', COALESCE((SELECT SUM(paid_amount) FROM daily_global_stats WHERE stat_date >= v_brazil_month_start), 0),
    'total_fees', COALESCE((SELECT SUM(total_fees) FROM daily_global_stats), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Add unique constraint on stat_date if not exists (for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_global_stats_stat_date_key'
  ) THEN
    ALTER TABLE daily_global_stats ADD CONSTRAINT daily_global_stats_stat_date_key UNIQUE (stat_date);
  END IF;
END $$;