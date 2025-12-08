-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Users can view their own products
CREATE POLICY "Users can view their own products"
ON public.products
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own products
CREATE POLICY "Users can create their own products"
ON public.products
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own products
CREATE POLICY "Users can update their own products"
ON public.products
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own products
CREATE POLICY "Users can delete their own products"
ON public.products
FOR DELETE
USING (user_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();