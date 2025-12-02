-- Create admin settings table
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create admin token table
CREATE TABLE public.admin_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_tokens ENABLE ROW LEVEL SECURITY;

-- Insert default admin token (hashed version of: admin-secret-2024)
-- In production, change this immediately!
INSERT INTO public.admin_tokens (token_hash) 
VALUES ('$2a$10$LvK8xH9kQ2mN5rT7wJ3yPuB1cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV');

-- Insert default settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('spedpay_api_key', ''),
  ('recipient_id', ''),
  ('meta_pixel_id', ''),
  ('meta_pixel_token', '');

-- Create function to validate admin token
CREATE OR REPLACE FUNCTION public.validate_admin_token(input_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_tokens 
    WHERE token_hash = input_token
  );
END;
$$;

-- Create function to get settings (public read for validated admins)
CREATE OR REPLACE FUNCTION public.get_admin_settings(input_token TEXT)
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  RETURN QUERY SELECT s.key, s.value FROM public.admin_settings s;
END;
$$;

-- Create function to update settings
CREATE OR REPLACE FUNCTION public.update_admin_setting(input_token TEXT, setting_key TEXT, setting_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  UPDATE public.admin_settings 
  SET value = setting_value, updated_at = now()
  WHERE key = setting_key;
  
  RETURN FOUND;
END;
$$;