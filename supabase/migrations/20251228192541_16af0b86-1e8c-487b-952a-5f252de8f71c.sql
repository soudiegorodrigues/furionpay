-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_pix_status_change_global_stats ON public.pix_transactions;
DROP TRIGGER IF EXISTS trigger_pix_delete_global_stats ON public.pix_transactions;
DROP FUNCTION IF EXISTS public.handle_pix_status_change_global_stats();

-- Create improved function that handles both increment and decrement
CREATE OR REPLACE FUNCTION public.handle_pix_status_change_global_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_old_date DATE;
  v_new_date DATE;
  v_old_fee NUMERIC;
  v_new_fee NUMERIC;
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'paid' THEN
      v_old_date := COALESCE(OLD.paid_date_brazil::DATE, (OLD.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      v_old_fee := COALESCE(OLD.fee_fixed, 0) + (OLD.amount * COALESCE(OLD.fee_percentage, 0) / 100);
      
      UPDATE public.daily_global_stats SET
        paid_count = GREATEST(0, paid_count - 1),
        paid_amount = GREATEST(0, paid_amount - OLD.amount),
        total_fees = GREATEST(0, total_fees - v_old_fee),
        updated_at = NOW()
      WHERE stat_date = v_old_date;
    END IF;
    
    IF OLD.status = 'pending' THEN
      v_old_date := COALESCE(OLD.created_date_brazil::DATE, (OLD.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      UPDATE public.daily_global_stats SET
        generated_count = GREATEST(0, generated_count - 1),
        generated_amount = GREATEST(0, generated_amount - OLD.amount),
        updated_at = NOW()
      WHERE stat_date = v_old_date;
    END IF;
    
    IF OLD.status = 'expired' THEN
      v_old_date := COALESCE(OLD.created_date_brazil::DATE, (OLD.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      UPDATE public.daily_global_stats SET
        expired_count = GREATEST(0, expired_count - 1),
        updated_at = NOW()
      WHERE stat_date = v_old_date;
    END IF;
    
    RETURN OLD;
  END IF;

  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      v_new_date := COALESCE(NEW.created_date_brazil::DATE, (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      INSERT INTO public.daily_global_stats (stat_date, generated_count, generated_amount)
      VALUES (v_new_date, 1, NEW.amount)
      ON CONFLICT (stat_date) DO UPDATE SET
        generated_count = daily_global_stats.generated_count + 1,
        generated_amount = daily_global_stats.generated_amount + NEW.amount,
        updated_at = NOW();
    END IF;
    
    IF NEW.status = 'paid' THEN
      v_new_date := COALESCE(NEW.paid_date_brazil::DATE, (NEW.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      v_new_fee := COALESCE(NEW.fee_fixed, 0) + (NEW.amount * COALESCE(NEW.fee_percentage, 0) / 100);
      
      INSERT INTO public.daily_global_stats (stat_date, paid_count, paid_amount, total_fees)
      VALUES (v_new_date, 1, NEW.amount, v_new_fee)
      ON CONFLICT (stat_date) DO UPDATE SET
        paid_count = daily_global_stats.paid_count + 1,
        paid_amount = daily_global_stats.paid_amount + NEW.amount,
        total_fees = daily_global_stats.total_fees + v_new_fee,
        updated_at = NOW();
    END IF;
    
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Decrement old status counts
    IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
      v_old_date := COALESCE(OLD.paid_date_brazil::DATE, (OLD.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      v_old_fee := COALESCE(OLD.fee_fixed, 0) + (OLD.amount * COALESCE(OLD.fee_percentage, 0) / 100);
      
      UPDATE public.daily_global_stats SET
        paid_count = GREATEST(0, paid_count - 1),
        paid_amount = GREATEST(0, paid_amount - OLD.amount),
        total_fees = GREATEST(0, total_fees - v_old_fee),
        updated_at = NOW()
      WHERE stat_date = v_old_date;
    END IF;
    
    IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
      v_old_date := COALESCE(OLD.created_date_brazil::DATE, (OLD.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      UPDATE public.daily_global_stats SET
        generated_count = GREATEST(0, generated_count - 1),
        generated_amount = GREATEST(0, generated_amount - OLD.amount),
        updated_at = NOW()
      WHERE stat_date = v_old_date;
    END IF;
    
    IF OLD.status = 'expired' AND NEW.status != 'expired' THEN
      v_old_date := COALESCE(OLD.created_date_brazil::DATE, (OLD.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      UPDATE public.daily_global_stats SET
        expired_count = GREATEST(0, expired_count - 1),
        updated_at = NOW()
      WHERE stat_date = v_old_date;
    END IF;
    
    -- Increment new status counts
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
      v_new_date := COALESCE(NEW.paid_date_brazil::DATE, (NEW.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      v_new_fee := COALESCE(NEW.fee_fixed, 0) + (NEW.amount * COALESCE(NEW.fee_percentage, 0) / 100);
      
      INSERT INTO public.daily_global_stats (stat_date, paid_count, paid_amount, total_fees)
      VALUES (v_new_date, 1, NEW.amount, v_new_fee)
      ON CONFLICT (stat_date) DO UPDATE SET
        paid_count = daily_global_stats.paid_count + 1,
        paid_amount = daily_global_stats.paid_amount + NEW.amount,
        total_fees = daily_global_stats.total_fees + v_new_fee,
        updated_at = NOW();
    END IF;
    
    IF NEW.status = 'expired' AND OLD.status != 'expired' THEN
      v_new_date := COALESCE(NEW.created_date_brazil::DATE, (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      INSERT INTO public.daily_global_stats (stat_date, expired_count)
      VALUES (v_new_date, 1)
      ON CONFLICT (stat_date) DO UPDATE SET
        expired_count = daily_global_stats.expired_count + 1,
        updated_at = NOW();
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for INSERT, UPDATE, and DELETE
CREATE TRIGGER trigger_pix_status_change_global_stats
  AFTER INSERT OR UPDATE ON public.pix_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pix_status_change_global_stats();

CREATE TRIGGER trigger_pix_delete_global_stats
  BEFORE DELETE ON public.pix_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pix_status_change_global_stats();