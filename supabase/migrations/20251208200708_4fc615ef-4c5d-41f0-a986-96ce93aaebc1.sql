-- Add code_hash column to password_reset_codes for storing hashed codes
ALTER TABLE public.password_reset_codes 
ADD COLUMN IF NOT EXISTS code_hash TEXT;

-- Create login_attempts table to track failed login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS on login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Deny all direct access to login_attempts (only edge functions with service role can access)
CREATE POLICY "Deny all direct access to login_attempts" 
ON public.login_attempts
AS RESTRICTIVE
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);

-- Create function to increment login attempts and check if should block
CREATE OR REPLACE FUNCTION public.increment_login_attempt(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_attempt_count INTEGER;
  v_is_blocked BOOLEAN;
BEGIN
  -- Insert or update login attempt
  INSERT INTO public.login_attempts (email, attempt_count, last_attempt_at)
  VALUES (p_email, 1, now())
  ON CONFLICT (email) DO UPDATE
  SET 
    attempt_count = CASE 
      WHEN login_attempts.is_blocked = true THEN login_attempts.attempt_count
      ELSE login_attempts.attempt_count + 1
    END,
    last_attempt_at = now(),
    is_blocked = CASE 
      WHEN login_attempts.attempt_count >= 2 AND login_attempts.is_blocked = false THEN true
      ELSE login_attempts.is_blocked
    END,
    blocked_at = CASE 
      WHEN login_attempts.attempt_count >= 2 AND login_attempts.is_blocked = false THEN now()
      ELSE login_attempts.blocked_at
    END
  RETURNING attempt_count, is_blocked INTO v_attempt_count, v_is_blocked;
  
  SELECT json_build_object(
    'attempt_count', v_attempt_count,
    'is_blocked', v_is_blocked,
    'should_send_code', v_attempt_count = 3 AND v_is_blocked = true
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Create function to check if email is blocked
CREATE OR REPLACE FUNCTION public.check_login_blocked(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'is_blocked', COALESCE(is_blocked, false),
    'attempt_count', COALESCE(attempt_count, 0)
  ) INTO v_result
  FROM public.login_attempts
  WHERE email = p_email;
  
  IF v_result IS NULL THEN
    v_result := json_build_object('is_blocked', false, 'attempt_count', 0);
  END IF;
  
  RETURN v_result;
END;
$$;

-- Create function to reset login attempts after successful login or unlock
CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.login_attempts
  SET attempt_count = 0, is_blocked = false, blocked_at = NULL
  WHERE email = p_email;
  
  RETURN true;
END;
$$;