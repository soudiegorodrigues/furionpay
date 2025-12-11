-- Create product_testimonials table for custom testimonials per product
CREATE TABLE public.product_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_photo_url TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_testimonials ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view testimonials for active products"
ON public.product_testimonials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_testimonials.product_id AND p.is_active = true
  )
);

CREATE POLICY "Users can manage their own product testimonials"
ON public.product_testimonials
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_product_testimonials_updated_at
BEFORE UPDATE ON public.product_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();