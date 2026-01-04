-- Create IP blacklist table for permanent blocking
CREATE TABLE public.ip_blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id),
  transactions_count INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blacklist
CREATE POLICY "Admins can manage ip_blacklist"
  ON public.ip_blacklist
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast IP lookups
CREATE INDEX idx_ip_blacklist_ip ON public.ip_blacklist(ip_address) WHERE is_active = true;

-- Insert the suspicious IPs identified in analysis
INSERT INTO public.ip_blacklist (ip_address, reason, transactions_count, total_amount) VALUES
  ('189.5.179.111', 'Fraude: 18 transações, 12 nomes diferentes, 0 pagas, R$ 31.685', 18, 31685),
  ('179.124.163.99', 'Fraude: 17 transações, 16 nomes diferentes, 0 pagas, R$ 28.240', 17, 28240),
  ('167.250.13.94', 'Fraude: 3 transações, 0 pagas, padrão suspeito', 3, 0),
  ('167.250.14.91', 'Fraude: 3 transações, 0 pagas, padrão suspeito', 3, 0),
  ('45.65.189.38', 'Fraude: 4 transações, 0 pagas, R$ 2.870', 4, 2870),
  ('189.90.158.141', 'Fraude: 4 transações, mesmo dispositivo, nomes diferentes', 4, 0);