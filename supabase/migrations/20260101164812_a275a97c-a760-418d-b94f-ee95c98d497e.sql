-- Atualizar a função de proteção (CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não for admin, preserva valores originais dos campos sensíveis
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_approved := OLD.is_approved;
    NEW.bypass_antifraud := OLD.bypass_antifraud;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;