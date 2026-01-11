-- Add offer_id column to product_daily_metrics table
ALTER TABLE public.product_daily_metrics 
ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.checkout_offers(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_product_daily_metrics_offer_id ON public.product_daily_metrics(offer_id);