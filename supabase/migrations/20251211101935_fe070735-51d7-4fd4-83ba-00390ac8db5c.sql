-- Create table for product checkout configurations
CREATE TABLE public.product_checkout_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL,
  
  -- Color settings
  primary_color TEXT DEFAULT '#16A34A',
  
  -- Template
  template TEXT DEFAULT 'padrao',
  
  -- Required fields
  require_address BOOLEAN DEFAULT false,
  require_phone BOOLEAN DEFAULT true,
  require_birthdate BOOLEAN DEFAULT false,
  require_cpf BOOLEAN DEFAULT false,
  require_email_confirmation BOOLEAN DEFAULT false,
  
  -- Features
  show_countdown BOOLEAN DEFAULT false,
  countdown_minutes INTEGER DEFAULT 15,
  show_notifications BOOLEAN DEFAULT false,
  custom_button_text TEXT,
  show_banners BOOLEAN DEFAULT false,
  
  -- Thank you page
  thank_you_url TEXT,
  show_whatsapp_button BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_checkout_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own checkout configs"
ON public.product_checkout_configs
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own checkout configs"
ON public.product_checkout_configs
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own checkout configs"
ON public.product_checkout_configs
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own checkout configs"
ON public.product_checkout_configs
FOR DELETE
USING (user_id = auth.uid());

-- Public access for checkout page (read only active configs)
CREATE POLICY "Anyone can view checkout configs for active products"
ON public.product_checkout_configs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_checkout_configs.product_id 
    AND p.is_active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_product_checkout_configs_updated_at
BEFORE UPDATE ON public.product_checkout_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();