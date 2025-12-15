-- Create new table for retry flow steps (card-based model)
CREATE TABLE public.retry_flow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  step_order INTEGER NOT NULL,
  acquirer TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payment_method, step_order)
);

-- Enable RLS
ALTER TABLE public.retry_flow_steps ENABLE ROW LEVEL SECURITY;

-- Admins can manage retry flow steps
CREATE POLICY "Admins can view retry flow steps" 
ON public.retry_flow_steps 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert retry flow steps" 
ON public.retry_flow_steps 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update retry flow steps" 
ON public.retry_flow_steps 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete retry flow steps" 
ON public.retry_flow_steps 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default configuration (migrate from old system)
INSERT INTO public.retry_flow_steps (payment_method, step_order, acquirer, is_active)
VALUES 
  ('pix', 1, 'ativus', true),
  ('pix', 2, 'spedpay', true),
  ('pix', 3, 'inter', true);