-- Create table for password reset codes
CREATE TABLE public.password_reset_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 minutes'),
  used BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for the edge function)
CREATE POLICY "Allow public insert" ON public.password_reset_codes
FOR INSERT WITH CHECK (true);

-- Allow public select for verification
CREATE POLICY "Allow public select" ON public.password_reset_codes
FOR SELECT USING (true);

-- Allow public update for marking as used
CREATE POLICY "Allow public update" ON public.password_reset_codes
FOR UPDATE USING (true);

-- Create index for faster lookup
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_code ON public.password_reset_codes(code);