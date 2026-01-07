-- Create audit logs table for PIX generation attempts
CREATE TABLE IF NOT EXISTS public.pix_generation_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  txid TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  acquirer TEXT,
  status TEXT NOT NULL DEFAULT 'attempted',
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  fallback_used BOOLEAN DEFAULT false,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pix_generation_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can view all audit logs" 
ON public.pix_generation_audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_settings 
    WHERE key = 'is_super_admin' 
    AND value = 'true' 
    AND user_id = auth.uid()
  )
);

-- Create policy for users to view their own logs
CREATE POLICY "Users can view their own audit logs" 
ON public.pix_generation_audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for edge functions to insert logs (service role)
CREATE POLICY "Service role can insert audit logs" 
ON public.pix_generation_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_pix_audit_logs_user_id ON public.pix_generation_audit_logs(user_id);
CREATE INDEX idx_pix_audit_logs_txid ON public.pix_generation_audit_logs(txid);
CREATE INDEX idx_pix_audit_logs_created_at ON public.pix_generation_audit_logs(created_at DESC);
CREATE INDEX idx_pix_audit_logs_status ON public.pix_generation_audit_logs(status);

-- Add comment for documentation
COMMENT ON TABLE public.pix_generation_audit_logs IS 'Audit trail for all PIX generation attempts to prevent data loss';