-- Create sales_funnels table
CREATE TABLE public.sales_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Meu Funil',
  is_active BOOLEAN DEFAULT true,
  origin_url TEXT,
  thank_you_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create funnel_steps table
CREATE TABLE public.funnel_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES sales_funnels(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('upsell', 'downsell', 'crosssell', 'thankyou')),
  offer_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  
  -- Visual configuration
  title TEXT DEFAULT 'Oferta Especial',
  headline TEXT,
  description TEXT,
  offer_price NUMERIC,
  original_price NUMERIC,
  timer_seconds INTEGER DEFAULT 300,
  button_accept_text TEXT DEFAULT 'SIM! Quero aproveitar',
  button_decline_text TEXT DEFAULT 'Não, obrigado',
  image_url TEXT,
  video_url TEXT,
  background_color TEXT DEFAULT '#ffffff',
  button_color TEXT DEFAULT '#22c55e',
  
  -- Redirect URLs (NULL means go to next step in funnel)
  accept_url TEXT,
  decline_url TEXT,
  next_step_on_accept UUID,
  next_step_on_decline UUID,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add self-referencing foreign keys after table creation
ALTER TABLE public.funnel_steps 
  ADD CONSTRAINT funnel_steps_next_accept_fkey 
  FOREIGN KEY (next_step_on_accept) REFERENCES funnel_steps(id) ON DELETE SET NULL;

ALTER TABLE public.funnel_steps 
  ADD CONSTRAINT funnel_steps_next_decline_fkey 
  FOREIGN KEY (next_step_on_decline) REFERENCES funnel_steps(id) ON DELETE SET NULL;

-- Create funnel_conversions table for metrics
CREATE TABLE public.funnel_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES sales_funnels(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES funnel_steps(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES pix_transactions(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'accepted', 'declined', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_funnels
CREATE POLICY "Users can view their own funnels" ON public.sales_funnels
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own funnels" ON public.sales_funnels
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own funnels" ON public.sales_funnels
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own funnels" ON public.sales_funnels
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for funnel_steps
CREATE POLICY "Users can view steps of their funnels" ON public.funnel_steps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales_funnels WHERE id = funnel_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create steps in their funnels" ON public.funnel_steps
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sales_funnels WHERE id = funnel_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update steps in their funnels" ON public.funnel_steps
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sales_funnels WHERE id = funnel_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete steps in their funnels" ON public.funnel_steps
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sales_funnels WHERE id = funnel_id AND user_id = auth.uid())
  );

-- Public access for funnel step page (customers viewing offers)
CREATE POLICY "Anyone can view active funnel steps" ON public.funnel_steps
  FOR SELECT USING (
    is_active = true AND 
    EXISTS (SELECT 1 FROM sales_funnels WHERE id = funnel_id AND is_active = true)
  );

-- RLS Policies for funnel_conversions
CREATE POLICY "Users can view conversions of their funnels" ON public.funnel_conversions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales_funnels WHERE id = funnel_id AND user_id = auth.uid())
  );

CREATE POLICY "Anyone can insert conversions" ON public.funnel_conversions
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_sales_funnels_user ON public.sales_funnels(user_id);
CREATE INDEX idx_sales_funnels_product ON public.sales_funnels(product_id);
CREATE INDEX idx_funnel_steps_funnel ON public.funnel_steps(funnel_id);
CREATE INDEX idx_funnel_steps_position ON public.funnel_steps(funnel_id, position);
CREATE INDEX idx_funnel_conversions_funnel ON public.funnel_conversions(funnel_id);
CREATE INDEX idx_funnel_conversions_step ON public.funnel_conversions(step_id);