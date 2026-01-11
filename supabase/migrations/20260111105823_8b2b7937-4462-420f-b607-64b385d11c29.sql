-- Create business_managers table for storing BMs
CREATE TABLE public.business_managers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create product_daily_metrics table for tracking daily expenses
CREATE TABLE public.product_daily_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    date date NOT NULL,
    bm_id uuid REFERENCES public.business_managers(id) ON DELETE SET NULL,
    budget numeric DEFAULT 0,
    spent numeric DEFAULT 0,
    revenue numeric DEFAULT 0,
    link text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_managers
CREATE POLICY "Users can view their own BMs"
ON public.business_managers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own BMs"
ON public.business_managers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own BMs"
ON public.business_managers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own BMs"
ON public.business_managers FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for product_daily_metrics
CREATE POLICY "Users can view their own metrics"
ON public.product_daily_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
ON public.product_daily_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
ON public.product_daily_metrics FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metrics"
ON public.product_daily_metrics FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_business_managers_user_id ON public.business_managers(user_id);
CREATE INDEX idx_product_daily_metrics_user_id ON public.product_daily_metrics(user_id);
CREATE INDEX idx_product_daily_metrics_date ON public.product_daily_metrics(date);
CREATE INDEX idx_product_daily_metrics_product_id ON public.product_daily_metrics(product_id);

-- Update trigger for updated_at
CREATE TRIGGER update_business_managers_updated_at
BEFORE UPDATE ON public.business_managers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_daily_metrics_updated_at
BEFORE UPDATE ON public.product_daily_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();