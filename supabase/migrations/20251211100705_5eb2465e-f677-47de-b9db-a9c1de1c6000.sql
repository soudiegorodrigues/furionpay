-- Create product_offers table for storing product offer plans
CREATE TABLE public.product_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'checkout',
  domain TEXT,
  offer_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own product offers"
ON public.product_offers
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own product offers"
ON public.product_offers
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own product offers"
ON public.product_offers
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own product offers"
ON public.product_offers
FOR DELETE
USING (user_id = auth.uid());

-- Generate unique offer code function
CREATE OR REPLACE FUNCTION public.generate_offer_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.product_offers WHERE offer_code = result) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.offer_code := result;
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic offer code generation
CREATE TRIGGER generate_product_offer_code
BEFORE INSERT ON public.product_offers
FOR EACH ROW
EXECUTE FUNCTION public.generate_offer_code();

-- Create trigger for updated_at
CREATE TRIGGER update_product_offers_updated_at
BEFORE UPDATE ON public.product_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();