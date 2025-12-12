-- Create function to assign default "Business" fee config to new users
CREATE OR REPLACE FUNCTION public.assign_default_fee_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_business_fee_id uuid;
BEGIN
  -- Get the ID of the "Business" fee config
  SELECT id INTO v_business_fee_id 
  FROM public.fee_configs 
  WHERE name = 'Business' 
  LIMIT 1;
  
  -- If Business fee exists, assign it to the new user
  IF v_business_fee_id IS NOT NULL THEN
    INSERT INTO public.admin_settings (key, value, user_id, created_at, updated_at)
    VALUES ('user_fee_config', v_business_fee_id::text, NEW.id, now(), now())
    ON CONFLICT (key, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to execute function when a new profile is created
CREATE TRIGGER on_profile_created_assign_fee
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_fee_config();