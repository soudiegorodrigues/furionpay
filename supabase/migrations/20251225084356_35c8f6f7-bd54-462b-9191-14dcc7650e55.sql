-- =============================================
-- UPSELL DE 1 CLIQUE - Tabelas e Políticas
-- =============================================

-- Tabela para configuração de upsells por produto
CREATE TABLE public.product_upsells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  upsell_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '🔥 Oferta Especial!',
  description TEXT,
  headline TEXT DEFAULT 'Espera! Temos uma oferta exclusiva para você',
  upsell_price NUMERIC NOT NULL,
  original_price NUMERIC,
  timer_seconds INTEGER DEFAULT 300,
  button_text TEXT DEFAULT 'SIM! Quero aproveitar',
  decline_text TEXT DEFAULT 'Não, obrigado',
  image_url TEXT,
  video_url TEXT,
  background_color TEXT DEFAULT '#ffffff',
  button_color TEXT DEFAULT '#22c55e',
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT different_products CHECK (product_id != upsell_product_id)
);

-- Tabela para rastrear transações de upsell
CREATE TABLE public.upsell_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_transaction_id UUID NOT NULL REFERENCES public.pix_transactions(id) ON DELETE CASCADE,
  upsell_id UUID NOT NULL REFERENCES public.product_upsells(id) ON DELETE CASCADE,
  upsell_transaction_id UUID REFERENCES public.pix_transactions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_product_upsells_product_id ON public.product_upsells(product_id);
CREATE INDEX idx_product_upsells_user_id ON public.product_upsells(user_id);
CREATE INDEX idx_product_upsells_active ON public.product_upsells(is_active) WHERE is_active = true;
CREATE INDEX idx_upsell_transactions_original ON public.upsell_transactions(original_transaction_id);
CREATE INDEX idx_upsell_transactions_status ON public.upsell_transactions(status);

-- Habilitar RLS
ALTER TABLE public.product_upsells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Políticas RLS para product_upsells
-- =============================================

-- Usuários podem ver seus próprios upsells
CREATE POLICY "Users can view their own upsells"
ON public.product_upsells
FOR SELECT
USING (user_id = auth.uid());

-- Usuários podem criar seus próprios upsells
CREATE POLICY "Users can create their own upsells"
ON public.product_upsells
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar seus próprios upsells
CREATE POLICY "Users can update their own upsells"
ON public.product_upsells
FOR UPDATE
USING (user_id = auth.uid());

-- Usuários podem deletar seus próprios upsells
CREATE POLICY "Users can delete their own upsells"
ON public.product_upsells
FOR DELETE
USING (user_id = auth.uid());

-- Acesso público para leitura de upsells ativos (para página de upsell)
CREATE POLICY "Anyone can view active upsells for active products"
ON public.product_upsells
FOR SELECT
USING (is_active = true AND is_active_product(product_id));

-- =============================================
-- Políticas RLS para upsell_transactions
-- =============================================

-- Usuários podem ver transações de upsell de seus produtos
CREATE POLICY "Users can view their own upsell transactions"
ON public.upsell_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.product_upsells pu 
    WHERE pu.id = upsell_transactions.upsell_id 
    AND pu.user_id = auth.uid()
  )
);

-- Service role pode inserir transações de upsell (via edge function)
CREATE POLICY "Service role can insert upsell transactions"
ON public.upsell_transactions
FOR INSERT
WITH CHECK (true);

-- Service role pode atualizar transações de upsell (via edge function)
CREATE POLICY "Service role can update upsell transactions"
ON public.upsell_transactions
FOR UPDATE
USING (true);

-- Admins podem ver todas as transações de upsell
CREATE POLICY "Admins can view all upsell transactions"
ON public.upsell_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Trigger para updated_at
-- =============================================

CREATE TRIGGER update_product_upsells_updated_at
BEFORE UPDATE ON public.product_upsells
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_upsell_transactions_updated_at
BEFORE UPDATE ON public.upsell_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();