
-- Create checkout_templates table for global templates (admin-managed)
CREATE TABLE public.checkout_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_code TEXT UNIQUE,
  layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  preview_image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkout_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view published templates
CREATE POLICY "Anyone can view published templates"
ON public.checkout_templates
FOR SELECT
USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage templates"
ON public.checkout_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Generate unique template code
CREATE OR REPLACE FUNCTION public.generate_template_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := 'T';
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.checkout_templates WHERE template_code = result) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.template_code := result;
  RETURN NEW;
END;
$function$;

-- Trigger for template code generation
CREATE TRIGGER generate_checkout_template_code
BEFORE INSERT ON public.checkout_templates
FOR EACH ROW
EXECUTE FUNCTION public.generate_template_code();

-- Trigger for updated_at
CREATE TRIGGER update_checkout_templates_updated_at
BEFORE UPDATE ON public.checkout_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add template_id to product_checkout_configs
ALTER TABLE public.product_checkout_configs 
ADD COLUMN template_id UUID REFERENCES public.checkout_templates(id) ON DELETE SET NULL;

-- Insert default templates
INSERT INTO public.checkout_templates (name, description, layout_config, is_published, is_default) VALUES
('Padrão', 'Template padrão com layout clássico', '{"type": "padrao"}', true, true),
('Vega', 'Template moderno com design minimalista', '{"type": "vega"}', true, false),
('Afilia', 'Template otimizado para afiliados', '{"type": "afilia"}', true, false),
('Multistep', 'Template com etapas de preenchimento', '{"type": "multistep"}', true, false);
