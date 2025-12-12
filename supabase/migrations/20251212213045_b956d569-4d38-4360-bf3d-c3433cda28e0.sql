
-- Create user_documents table
CREATE TABLE public.user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('pf', 'pj')),
  document_type TEXT NOT NULL, -- 'rg', 'cnh', 'passaporte', 'cnpj_card', 'contrato_social'
  document_side TEXT, -- 'frente', 'verso', 'selfie' (só para PF)
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_verification table
CREATE TABLE public.user_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('pf', 'pj')),
  document_type_selected TEXT NOT NULL, -- 'rg', 'cnh', 'passaporte' (para PF), 'cnpj' (para PJ)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_verification ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_documents
CREATE POLICY "Users can insert their own documents"
ON public.user_documents FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own documents"
ON public.user_documents FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents"
ON public.user_documents FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all documents"
ON public.user_documents FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_verification
CREATE POLICY "Users can insert their own verification"
ON public.user_verification FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own verification"
ON public.user_verification FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own pending verification"
ON public.user_verification FOR UPDATE
USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Users can delete their own verification"
ON public.user_verification FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all verifications"
ON public.user_verification FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all verifications"
ON public.user_verification FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create PRIVATE storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', false);

-- Storage policies
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all documents in bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- RPC Functions

-- Get user's verification status
CREATE OR REPLACE FUNCTION public.get_my_verification_status()
RETURNS TABLE(
  id UUID,
  person_type TEXT,
  document_type_selected TEXT,
  status TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.person_type,
    v.document_type_selected,
    v.status,
    v.rejection_reason,
    v.reviewed_at,
    v.created_at
  FROM user_verification v
  WHERE v.user_id = auth.uid();
END;
$$;

-- Get pending verifications (admin only)
CREATE OR REPLACE FUNCTION public.get_pending_verifications()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_email TEXT,
  person_type TEXT,
  document_type_selected TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view pending verifications';
  END IF;

  RETURN QUERY
  SELECT 
    v.id,
    v.user_id,
    u.email::TEXT as user_email,
    v.person_type,
    v.document_type_selected,
    v.status,
    v.created_at
  FROM user_verification v
  JOIN auth.users u ON u.id = v.user_id
  ORDER BY v.created_at ASC;
END;
$$;

-- Approve document verification (admin only)
CREATE OR REPLACE FUNCTION public.approve_document_verification(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve verifications';
  END IF;

  UPDATE user_verification
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Reject document verification (admin only)
CREATE OR REPLACE FUNCTION public.reject_document_verification(p_user_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject verifications';
  END IF;

  UPDATE user_verification
  SET 
    status = 'rejected',
    rejection_reason = p_reason,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Get user documents for admin
CREATE OR REPLACE FUNCTION public.get_user_documents_admin(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  document_type TEXT,
  document_side TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view user documents';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.document_type,
    d.document_side,
    d.file_url,
    d.created_at
  FROM user_documents d
  WHERE d.user_id = p_user_id
  ORDER BY d.created_at ASC;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_user_documents_updated_at
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_verification_updated_at
  BEFORE UPDATE ON public.user_verification
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
