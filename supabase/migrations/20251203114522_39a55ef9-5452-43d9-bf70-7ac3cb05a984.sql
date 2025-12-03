-- Create table for available domains (managed by admins)
CREATE TABLE public.available_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.available_domains ENABLE ROW LEVEL SECURITY;

-- Anyone can read active domains
CREATE POLICY "Anyone can view active domains" ON public.available_domains
FOR SELECT USING (is_active = true);

-- Only admins can insert domains
CREATE POLICY "Admins can insert domains" ON public.available_domains
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update domains
CREATE POLICY "Admins can update domains" ON public.available_domains
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete domains
CREATE POLICY "Admins can delete domains" ON public.available_domains
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookup
CREATE INDEX idx_available_domains_active ON public.available_domains(is_active);

-- Insert a default domain
INSERT INTO public.available_domains (domain, name, is_active) 
VALUES ('doarcomamor.shop', 'Doar com Amor', true);