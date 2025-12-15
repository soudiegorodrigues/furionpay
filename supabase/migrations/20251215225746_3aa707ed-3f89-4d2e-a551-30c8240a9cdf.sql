-- Create retry_configurations table for automatic retry logic
CREATE TABLE public.retry_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method TEXT NOT NULL DEFAULT 'pix',
  enabled BOOLEAN NOT NULL DEFAULT true,
  max_retries INTEGER NOT NULL DEFAULT 5,
  acquirer_order TEXT[] NOT NULL DEFAULT ARRAY['ativus', 'spedpay', 'inter'],
  delay_between_retries_ms INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('pix', 'card', 'boleto')),
  CONSTRAINT valid_max_retries CHECK (max_retries >= 1 AND max_retries <= 10),
  CONSTRAINT valid_delay CHECK (delay_between_retries_ms >= 500 AND delay_between_retries_ms <= 10000),
  UNIQUE (payment_method)
);

-- Enable RLS
ALTER TABLE public.retry_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage retry configurations
CREATE POLICY "Admins can view retry configurations"
ON public.retry_configurations FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert retry configurations"
ON public.retry_configurations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update retry configurations"
ON public.retry_configurations FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete retry configurations"
ON public.retry_configurations FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_retry_configurations_updated_at
BEFORE UPDATE ON public.retry_configurations
FOR EACH ROW
EXECUTE FUNCTION update_finance_updated_at();

-- Insert default PIX retry configuration
INSERT INTO public.retry_configurations (payment_method, enabled, max_retries, acquirer_order, delay_between_retries_ms)
VALUES ('pix', true, 5, ARRAY['ativus', 'spedpay', 'inter'], 1000)
ON CONFLICT (payment_method) DO NOTHING;