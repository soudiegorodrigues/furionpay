-- =====================================================
-- Tabela para códigos de backup do 2FA
-- =====================================================

CREATE TABLE public.mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code_hash text NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índice para busca rápida por usuário
CREATE INDEX idx_mfa_backup_codes_user_id ON public.mfa_backup_codes(user_id);

-- RLS: usuário só vê seus próprios códigos
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own backup codes"
ON public.mfa_backup_codes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own backup codes"
ON public.mfa_backup_codes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own backup codes"
ON public.mfa_backup_codes FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own backup codes"
ON public.mfa_backup_codes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Tabela para logs de auditoria do 2FA
CREATE TABLE public.mfa_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL, -- 'enrolled', 'verified', 'unenrolled', 'failed', 'backup_used', 'reset_via_email', 'reset_by_admin'
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índice para busca por usuário
CREATE INDEX idx_mfa_audit_logs_user_id ON public.mfa_audit_logs(user_id);
CREATE INDEX idx_mfa_audit_logs_created_at ON public.mfa_audit_logs(created_at DESC);

-- RLS: apenas admins podem ver logs de auditoria
ALTER TABLE public.mfa_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
ON public.mfa_audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.mfa_audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Função para verificar código de backup
CREATE OR REPLACE FUNCTION public.verify_backup_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_code_hash text;
  v_found boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  v_code_hash := encode(sha256(p_code::bytea), 'hex');
  
  UPDATE public.mfa_backup_codes
  SET used = true, used_at = now()
  WHERE user_id = auth.uid() 
    AND code_hash = v_code_hash 
    AND used = false
  RETURNING true INTO v_found;
  
  IF v_found THEN
    INSERT INTO public.mfa_audit_logs (user_id, event_type, metadata)
    VALUES (auth.uid(), 'backup_used', jsonb_build_object('code_prefix', left(p_code, 4)));
  END IF;
  
  RETURN COALESCE(v_found, false);
END;
$$;

-- Função para gerar códigos de backup
CREATE OR REPLACE FUNCTION public.generate_backup_codes(p_count integer DEFAULT 8)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_codes text[] := '{}';
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
  j integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Deletar códigos antigos
  DELETE FROM public.mfa_backup_codes WHERE user_id = auth.uid();
  
  -- Gerar novos códigos
  FOR i IN 1..p_count LOOP
    v_code := '';
    FOR j IN 1..8 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    END LOOP;
    
    v_codes := array_append(v_codes, v_code);
    
    INSERT INTO public.mfa_backup_codes (user_id, code_hash)
    VALUES (auth.uid(), encode(sha256(v_code::bytea), 'hex'));
  END LOOP;
  
  RETURN v_codes;
END;
$$;

-- Função para contar códigos de backup restantes
CREATE OR REPLACE FUNCTION public.count_backup_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN (
    SELECT COUNT(*)::integer 
    FROM public.mfa_backup_codes 
    WHERE user_id = auth.uid() AND used = false
  );
END;
$$;

-- Função para admin resetar 2FA de usuário
CREATE OR REPLACE FUNCTION public.admin_can_reset_2fa(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin');
END;
$$;