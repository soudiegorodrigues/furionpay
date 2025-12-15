
-- Fix search_path vulnerability in update_finance_updated_at function
CREATE OR REPLACE FUNCTION public.update_finance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
