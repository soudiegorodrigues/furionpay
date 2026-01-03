-- Create chargebacks table for tracking refunds/chargebacks
CREATE TABLE public.chargebacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pix_transaction_id UUID REFERENCES public.pix_transactions(id) ON DELETE SET NULL,
  external_id TEXT NOT NULL,
  acquirer TEXT NOT NULL DEFAULT 'valorion',
  amount NUMERIC NOT NULL,
  original_amount NUMERIC,
  client_name TEXT,
  client_document TEXT,
  client_email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed', 'resolved')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('webhook', 'manual', 'reconciliation')),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_chargebacks_user_id ON public.chargebacks(user_id);
CREATE INDEX idx_chargebacks_status ON public.chargebacks(status);
CREATE INDEX idx_chargebacks_external_id ON public.chargebacks(external_id);
CREATE INDEX idx_chargebacks_detected_at ON public.chargebacks(detected_at DESC);
CREATE INDEX idx_chargebacks_acquirer ON public.chargebacks(acquirer);

-- Enable RLS
ALTER TABLE public.chargebacks ENABLE ROW LEVEL SECURITY;

-- Admins can manage all chargebacks
CREATE POLICY "Admins can manage all chargebacks"
ON public.chargebacks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own chargebacks
CREATE POLICY "Users can view their own chargebacks"
ON public.chargebacks
FOR SELECT
USING (user_id = auth.uid());

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_chargebacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chargebacks_updated_at
BEFORE UPDATE ON public.chargebacks
FOR EACH ROW
EXECUTE FUNCTION public.update_chargebacks_updated_at();

-- Add refunded status to pix_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'refunded' AND enumtypid = 'pix_status'::regtype) THEN
    ALTER TYPE pix_status ADD VALUE 'refunded';
  END IF;
END$$;

-- Create RPC to mark transaction as refunded and create chargeback record
CREATE OR REPLACE FUNCTION public.mark_pix_refunded(
  p_transaction_id UUID,
  p_external_id TEXT,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual'
)
RETURNS JSONB AS $$
DECLARE
  v_transaction RECORD;
  v_chargeback_id UUID;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction FROM public.pix_transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF v_transaction.status = 'refunded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already refunded');
  END IF;
  
  -- Update transaction status
  UPDATE public.pix_transactions 
  SET status = 'refunded'
  WHERE id = p_transaction_id;
  
  -- Create chargeback record
  INSERT INTO public.chargebacks (
    pix_transaction_id,
    external_id,
    acquirer,
    amount,
    original_amount,
    client_name,
    client_document,
    client_email,
    reason,
    source,
    user_id,
    notes
  ) VALUES (
    p_transaction_id,
    COALESCE(p_external_id, v_transaction.txid),
    COALESCE(v_transaction.acquirer, 'unknown'),
    v_transaction.amount,
    v_transaction.amount,
    v_transaction.donor_name,
    v_transaction.donor_cpf,
    v_transaction.donor_email,
    p_reason,
    p_source,
    v_transaction.user_id,
    p_notes
  ) RETURNING id INTO v_chargeback_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'chargeback_id', v_chargeback_id,
    'transaction_id', p_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;