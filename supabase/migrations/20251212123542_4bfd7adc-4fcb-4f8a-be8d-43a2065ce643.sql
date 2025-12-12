-- Create fee_configs table to store fee configurations
CREATE TABLE public.fee_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'default',
  pix_percentage NUMERIC NOT NULL DEFAULT 6.99,
  pix_fixed NUMERIC NOT NULL DEFAULT 2.49,
  pix_repasse_percentage NUMERIC NOT NULL DEFAULT 15,
  pix_repasse_days INTEGER NOT NULL DEFAULT 60,
  boleto_percentage NUMERIC NOT NULL DEFAULT 6.99,
  boleto_fixed NUMERIC NOT NULL DEFAULT 2.49,
  boleto_repasse_percentage NUMERIC NOT NULL DEFAULT 0,
  boleto_repasse_days INTEGER NOT NULL DEFAULT 2,
  cartao_percentage NUMERIC NOT NULL DEFAULT 7.89,
  cartao_fixed NUMERIC NOT NULL DEFAULT 2.49,
  cartao_repasse_percentage NUMERIC NOT NULL DEFAULT 20,
  cartao_repasse_days INTEGER NOT NULL DEFAULT 75,
  saque_percentage NUMERIC NOT NULL DEFAULT 0,
  saque_fixed NUMERIC NOT NULL DEFAULT 4.99,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage fee configs
CREATE POLICY "Admins can view all fee configs"
ON public.fee_configs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert fee configs"
ON public.fee_configs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update fee configs"
ON public.fee_configs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete fee configs"
ON public.fee_configs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_fee_configs_updated_at
BEFORE UPDATE ON public.fee_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default fee config
INSERT INTO public.fee_configs (name, is_default) VALUES ('default', true);