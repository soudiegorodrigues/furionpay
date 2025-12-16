-- Tabela para rate limiting de PIX
CREATE TABLE public.pix_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL,
  ip_address TEXT,
  unpaid_count INTEGER DEFAULT 0,
  last_generation_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(fingerprint_hash)
);

-- Adicionar colunas em pix_transactions para rastreamento
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT,
ADD COLUMN IF NOT EXISTS client_ip TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pix_rate_limits_fingerprint ON public.pix_rate_limits(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_pix_rate_limits_ip ON public.pix_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_pix_transactions_fingerprint ON public.pix_transactions(fingerprint_hash);

-- RLS para pix_rate_limits (acesso apenas via service role nas edge functions)
ALTER TABLE public.pix_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to rate limits"
ON public.pix_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para decrementar contador quando PIX é pago
CREATE OR REPLACE FUNCTION public.decrement_rate_limit_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando status muda de 'generated' para 'paid', decrementa contador
  IF NEW.status = 'paid' AND OLD.status = 'generated' AND NEW.fingerprint_hash IS NOT NULL THEN
    UPDATE public.pix_rate_limits
    SET 
      unpaid_count = GREATEST(0, unpaid_count - 1),
      updated_at = now()
    WHERE fingerprint_hash = NEW.fingerprint_hash;
    
    RAISE LOG '[RATE-LIMIT] Decremented unpaid_count for fingerprint: %', NEW.fingerprint_hash;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_decrement_rate_limit ON public.pix_transactions;
CREATE TRIGGER trigger_decrement_rate_limit
  AFTER UPDATE ON public.pix_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_rate_limit_on_payment();

-- Trigger para auto-expirar transações e decrementar contador
CREATE OR REPLACE FUNCTION public.decrement_rate_limit_on_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando status muda para 'expired', decrementa contador
  IF NEW.status = 'expired' AND OLD.status = 'generated' AND NEW.fingerprint_hash IS NOT NULL THEN
    UPDATE public.pix_rate_limits
    SET 
      unpaid_count = GREATEST(0, unpaid_count - 1),
      updated_at = now()
    WHERE fingerprint_hash = NEW.fingerprint_hash;
    
    RAISE LOG '[RATE-LIMIT] Decremented unpaid_count on expiry for fingerprint: %', NEW.fingerprint_hash;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para expiração
DROP TRIGGER IF EXISTS trigger_decrement_rate_limit_expiry ON public.pix_transactions;
CREATE TRIGGER trigger_decrement_rate_limit_expiry
  AFTER UPDATE ON public.pix_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_rate_limit_on_expiry();