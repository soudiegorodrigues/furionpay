-- Tabela para armazenar múltiplas ofertas/links de checkout por usuário
CREATE TABLE public.checkout_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Minha Oferta',
  domain text,
  popup_model text DEFAULT 'landing',
  product_name text,
  meta_pixel_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkout_offers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own offers"
ON public.checkout_offers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own offers"
ON public.checkout_offers FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own offers"
ON public.checkout_offers FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own offers"
ON public.checkout_offers FOR DELETE
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_checkout_offers_updated_at
BEFORE UPDATE ON public.checkout_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();