-- Create table for Order Bumps
CREATE TABLE public.product_order_bumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  bump_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Adicione também!',
  description TEXT,
  bump_price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_order_bumps_product_id ON public.product_order_bumps(product_id);
CREATE INDEX idx_order_bumps_user_id ON public.product_order_bumps(user_id);

-- Enable RLS
ALTER TABLE public.product_order_bumps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own order bumps
CREATE POLICY "Users can view own order bumps" 
ON public.product_order_bumps 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own order bumps" 
ON public.product_order_bumps 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own order bumps" 
ON public.product_order_bumps 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own order bumps" 
ON public.product_order_bumps 
FOR DELETE 
USING (user_id = auth.uid());

-- Policy: Public can view active order bumps (for checkout)
CREATE POLICY "Public can view active order bumps" 
ON public.product_order_bumps 
FOR SELECT 
USING (is_active = true);

-- Add order_bumps column to pix_transactions for storing selected bumps
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS order_bumps JSONB DEFAULT NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_order_bumps_updated_at
BEFORE UPDATE ON public.product_order_bumps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();