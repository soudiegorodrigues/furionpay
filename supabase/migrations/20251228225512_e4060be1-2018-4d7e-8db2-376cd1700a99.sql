-- Fix trigger functions to use 'generated' instead of 'pending'

-- Update handle_pix_status_change_global_stats
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
    
    IF OLD.status = 'generated' THEN
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
    IF NEW.status = 'generated' THEN
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
    
    IF OLD.status = 'generated' AND NEW.status != 'generated' THEN
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
    
    IF NEW.status = 'generated' AND OLD.status != 'generated' THEN
      v_new_date := COALESCE(NEW.created_date_brazil::DATE, (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      INSERT INTO public.daily_global_stats (stat_date, generated_count, generated_amount)
      VALUES (v_new_date, 1, NEW.amount)
      ON CONFLICT (stat_date) DO UPDATE SET
        generated_count = daily_global_stats.generated_count + 1,
        generated_amount = daily_global_stats.generated_amount + NEW.amount,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update handle_pix_status_change_user_stats
CREATE OR REPLACE FUNCTION public.handle_pix_status_change_user_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_old_date DATE;
  v_new_date DATE;
  v_old_fee NUMERIC;
  v_new_fee NUMERIC;
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NULL THEN
      RETURN OLD;
    END IF;
    
    IF OLD.status = 'paid' THEN
      v_old_date := COALESCE(OLD.paid_date_brazil::DATE, (OLD.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      v_old_fee := COALESCE(OLD.fee_fixed, 0) + (OLD.amount * COALESCE(OLD.fee_percentage, 0) / 100);
      
      UPDATE public.daily_user_stats SET
        paid_count = GREATEST(0, paid_count - 1),
        paid_amount = GREATEST(0, paid_amount - OLD.amount),
        total_fees = GREATEST(0, total_fees - v_old_fee),
        updated_at = NOW()
      WHERE stat_date = v_old_date AND user_id = OLD.user_id;
    END IF;
    
    IF OLD.status = 'generated' THEN
      v_old_date := COALESCE(OLD.created_date_brazil::DATE, (OLD.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      UPDATE public.daily_user_stats SET
        generated_count = GREATEST(0, generated_count - 1),
        generated_amount = GREATEST(0, generated_amount - OLD.amount),
        updated_at = NOW()
      WHERE stat_date = v_old_date AND user_id = OLD.user_id;
    END IF;
    
    IF OLD.status = 'expired' THEN
      v_old_date := COALESCE(OLD.created_date_brazil::DATE, (OLD.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      UPDATE public.daily_user_stats SET
        expired_count = GREATEST(0, expired_count - 1),
        updated_at = NOW()
      WHERE stat_date = v_old_date AND user_id = OLD.user_id;
    END IF;
    
    RETURN OLD;
  END IF;

  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    IF NEW.status = 'generated' THEN
      v_new_date := COALESCE(NEW.created_date_brazil::DATE, (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      
      INSERT INTO public.daily_user_stats (user_id, stat_date, generated_count, generated_amount)
      VALUES (NEW.user_id, v_new_date, 1, NEW.amount)
      ON CONFLICT (user_id, stat_date) DO UPDATE SET
        generated_count = daily_user_stats.generated_count + 1,
        generated_amount = daily_user_stats.generated_amount + NEW.amount,
        updated_at = NOW();
    END IF;
    
    IF NEW.status = 'paid' THEN
      v_new_date := COALESCE(NEW.paid_date_brazil::DATE, (NEW.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
      v_new_fee := COALESCE(NEW.fee_fixed, 0) + (NEW.amount * COALESCE(NEW.fee_percentage, 0) / 100);
      
      INSERT INTO public.daily_user_stats (user_id, stat_date, paid_count, paid_amount, total_fees)
      VALUES (NEW.user_id, v_new_date, 1, NEW.amount, v_new_fee)
      ON CONFLICT (user_id, stat_date) DO UPDATE SET
        paid_count = daily_user_stats.paid_count + 1,
        paid_amount = daily_user_stats.paid_amount + NEW.amount,
        total_fees = daily_user_stats.total_fees + v_new_fee,
        updated_at = NOW();
    END IF;
    
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Decrement old status counts (only if user_id exists)
    IF OLD.user_id IS NOT NULL THEN
      IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
        v_old_date := COALESCE(OLD.paid_date_brazil::DATE, (OLD.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
        v_old_fee := COALESCE(OLD.fee_fixed, 0) + (OLD.amount * COALESCE(OLD.fee_percentage, 0) / 100);
        
        UPDATE public.daily_user_stats SET
          paid_count = GREATEST(0, paid_count - 1),
          paid_amount = GREATEST(0, paid_amount - OLD.amount),
          total_fees = GREATEST(0, total_fees - v_old_fee),
          updated_at = NOW()
        WHERE stat_date = v_old_date AND user_id = OLD.user_id;
      END IF;
      
      IF OLD.status = 'generated' AND NEW.status != 'generated' THEN
        v_old_date := COALESCE(OLD.created_date_brazil::DATE, (OLD.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
        
        UPDATE public.daily_user_stats SET
          generated_count = GREATEST(0, generated_count - 1),
          generated_amount = GREATEST(0, generated_amount - OLD.amount),
          updated_at = NOW()
        WHERE stat_date = v_old_date AND user_id = OLD.user_id;
      END IF;
      
      IF OLD.status = 'expired' AND NEW.status != 'expired' THEN
        v_old_date := COALESCE(OLD.created_date_brazil::DATE, (OLD.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
        
        UPDATE public.daily_user_stats SET
          expired_count = GREATEST(0, expired_count - 1),
          updated_at = NOW()
        WHERE stat_date = v_old_date AND user_id = OLD.user_id;
      END IF;
    END IF;
    
    -- Increment new status counts (only if user_id exists)
    IF NEW.user_id IS NOT NULL THEN
      IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        v_new_date := COALESCE(NEW.paid_date_brazil::DATE, (NEW.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
        v_new_fee := COALESCE(NEW.fee_fixed, 0) + (NEW.amount * COALESCE(NEW.fee_percentage, 0) / 100);
        
        INSERT INTO public.daily_user_stats (user_id, stat_date, paid_count, paid_amount, total_fees)
        VALUES (NEW.user_id, v_new_date, 1, NEW.amount, v_new_fee)
        ON CONFLICT (user_id, stat_date) DO UPDATE SET
          paid_count = daily_user_stats.paid_count + 1,
          paid_amount = daily_user_stats.paid_amount + NEW.amount,
          total_fees = daily_user_stats.total_fees + v_new_fee,
          updated_at = NOW();
      END IF;
      
      IF NEW.status = 'generated' AND OLD.status != 'generated' THEN
        v_new_date := COALESCE(NEW.created_date_brazil::DATE, (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
        
        INSERT INTO public.daily_user_stats (user_id, stat_date, generated_count, generated_amount)
        VALUES (NEW.user_id, v_new_date, 1, NEW.amount)
        ON CONFLICT (user_id, stat_date) DO UPDATE SET
          generated_count = daily_user_stats.generated_count + 1,
          generated_amount = daily_user_stats.generated_amount + NEW.amount,
          updated_at = NOW();
      END IF;
      
      IF NEW.status = 'expired' AND OLD.status != 'expired' THEN
        v_new_date := COALESCE(NEW.created_date_brazil::DATE, (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE);
        
        INSERT INTO public.daily_user_stats (user_id, stat_date, expired_count)
        VALUES (NEW.user_id, v_new_date, 1)
        ON CONFLICT (user_id, stat_date) DO UPDATE SET
          expired_count = daily_user_stats.expired_count + 1,
          updated_at = NOW();
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;