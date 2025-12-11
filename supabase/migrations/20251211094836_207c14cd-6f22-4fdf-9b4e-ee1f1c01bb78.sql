-- Add product_code column
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_code TEXT;

-- Create function to generate short product code
CREATE OR REPLACE FUNCTION public.generate_product_code()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  -- Generate unique 6-character code
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.products WHERE product_code = result) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.product_code := result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new products
DROP TRIGGER IF EXISTS set_product_code ON public.products;
CREATE TRIGGER set_product_code
  BEFORE INSERT ON public.products
  FOR EACH ROW
  WHEN (NEW.product_code IS NULL)
  EXECUTE FUNCTION public.generate_product_code();