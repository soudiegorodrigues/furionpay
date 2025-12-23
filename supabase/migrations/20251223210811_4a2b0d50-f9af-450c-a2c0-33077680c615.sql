-- Create checkout_banners table for multiple banners per product
CREATE TABLE public.checkout_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_checkout_banners_product_id ON public.checkout_banners(product_id);
CREATE INDEX idx_checkout_banners_user_id ON public.checkout_banners(user_id);

-- Enable RLS
ALTER TABLE public.checkout_banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own banners"
ON public.checkout_banners FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own banners"
ON public.checkout_banners FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own banners"
ON public.checkout_banners FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own banners"
ON public.checkout_banners FOR DELETE
USING (user_id = auth.uid());

-- Public can view banners for active products (for checkout pages)
CREATE POLICY "Anyone can view banners for active products"
ON public.checkout_banners FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = checkout_banners.product_id 
    AND p.is_active = true
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_checkout_banners_updated_at
BEFORE UPDATE ON public.checkout_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();