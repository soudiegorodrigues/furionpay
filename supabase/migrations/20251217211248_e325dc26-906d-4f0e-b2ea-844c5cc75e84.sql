-- =============================================
-- FASE 1: Sistema de Colaboradores com Permissões Granulares
-- =============================================

-- Criar tabela para armazenar colaboradores e suas permissões
CREATE TABLE public.collaborator_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  
  -- Permissões por área
  can_view_dashboard BOOLEAN DEFAULT false,
  can_manage_checkout BOOLEAN DEFAULT false,
  can_manage_products BOOLEAN DEFAULT false,
  can_view_financeiro BOOLEAN DEFAULT false,
  can_manage_financeiro BOOLEAN DEFAULT false,
  can_view_transactions BOOLEAN DEFAULT false,
  can_manage_integrations BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  
  -- Metadados
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Cada usuário só pode ser colaborador de um owner uma vez
  UNIQUE(user_id, owner_id)
);

-- Habilitar RLS
ALTER TABLE public.collaborator_permissions ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX idx_collaborator_permissions_user_id ON public.collaborator_permissions(user_id);
CREATE INDEX idx_collaborator_permissions_owner_id ON public.collaborator_permissions(owner_id);
CREATE INDEX idx_collaborator_permissions_active ON public.collaborator_permissions(is_active) WHERE is_active = true;

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- Owners podem ver seus colaboradores
CREATE POLICY "Owners can view their collaborators"
ON public.collaborator_permissions FOR SELECT
USING (owner_id = auth.uid());

-- Colaboradores podem ver suas próprias permissões
CREATE POLICY "Users can view their own permissions"
ON public.collaborator_permissions FOR SELECT
USING (user_id = auth.uid());

-- Owners podem inserir colaboradores
CREATE POLICY "Owners can insert collaborators"
ON public.collaborator_permissions FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Owners podem atualizar seus colaboradores
CREATE POLICY "Owners can update their collaborators"
ON public.collaborator_permissions FOR UPDATE
USING (owner_id = auth.uid());

-- Owners podem deletar seus colaboradores
CREATE POLICY "Owners can delete their collaborators"
ON public.collaborator_permissions FOR DELETE
USING (owner_id = auth.uid());

-- Admins podem ver todos os colaboradores
CREATE POLICY "Admins can view all collaborators"
ON public.collaborator_permissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para verificar se usuário tem permissão específica
CREATE OR REPLACE FUNCTION public.has_collaborator_permission(
  _user_id UUID,
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_perm BOOLEAN := false;
  collab_record RECORD;
BEGIN
  -- Admins têm todas as permissões
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;
  
  -- Buscar se é colaborador ativo de alguém
  SELECT * INTO collab_record
  FROM collaborator_permissions 
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
  
  -- Se não é colaborador de ninguém, é owner e tem acesso total
  IF collab_record IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar permissão específica do colaborador
  CASE _permission
    WHEN 'can_view_dashboard' THEN has_perm := collab_record.can_view_dashboard;
    WHEN 'can_manage_checkout' THEN has_perm := collab_record.can_manage_checkout;
    WHEN 'can_manage_products' THEN has_perm := collab_record.can_manage_products;
    WHEN 'can_view_financeiro' THEN has_perm := collab_record.can_view_financeiro;
    WHEN 'can_manage_financeiro' THEN has_perm := collab_record.can_manage_financeiro;
    WHEN 'can_view_transactions' THEN has_perm := collab_record.can_view_transactions;
    WHEN 'can_manage_integrations' THEN has_perm := collab_record.can_manage_integrations;
    WHEN 'can_manage_settings' THEN has_perm := collab_record.can_manage_settings;
    ELSE has_perm := false;
  END CASE;
  
  RETURN COALESCE(has_perm, false);
END;
$$;

-- Função para obter o owner_id efetivo (se é colaborador, retorna owner_id; se é owner, retorna próprio id)
CREATE OR REPLACE FUNCTION public.get_effective_owner_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_owner UUID;
BEGIN
  -- Buscar se é colaborador ativo de alguém
  SELECT owner_id INTO effective_owner
  FROM collaborator_permissions 
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
  
  -- Se não é colaborador, retorna o próprio ID (é owner)
  IF effective_owner IS NULL THEN
    RETURN _user_id;
  END IF;
  
  RETURN effective_owner;
END;
$$;

-- Função para buscar usuário por email (para adicionar colaborador)
CREATE OR REPLACE FUNCTION public.get_user_by_email(_email TEXT)
RETURNS TABLE(id UUID, email TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Somente usuários autenticados podem buscar
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    p.full_name
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  WHERE au.email = _email;
END;
$$;

-- Função para adicionar colaborador
CREATE OR REPLACE FUNCTION public.add_collaborator(
  _collaborator_email TEXT,
  _permissions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_user_id UUID;
  new_id UUID;
BEGIN
  -- Verificar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Buscar ID do colaborador pelo email
  SELECT id INTO collaborator_user_id
  FROM auth.users
  WHERE email = _collaborator_email;
  
  IF collaborator_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado. O usuário precisa ter uma conta no sistema.', _collaborator_email;
  END IF;
  
  -- Não pode adicionar a si mesmo
  IF collaborator_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode adicionar a si mesmo como colaborador';
  END IF;
  
  -- Verificar se já é colaborador
  IF EXISTS(
    SELECT 1 FROM collaborator_permissions 
    WHERE user_id = collaborator_user_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Este usuário já é seu colaborador';
  END IF;
  
  -- Inserir colaborador com permissões
  INSERT INTO collaborator_permissions (
    user_id,
    owner_id,
    can_view_dashboard,
    can_manage_checkout,
    can_manage_products,
    can_view_financeiro,
    can_manage_financeiro,
    can_view_transactions,
    can_manage_integrations,
    can_manage_settings,
    accepted_at
  ) VALUES (
    collaborator_user_id,
    auth.uid(),
    COALESCE((_permissions->>'can_view_dashboard')::BOOLEAN, false),
    COALESCE((_permissions->>'can_manage_checkout')::BOOLEAN, false),
    COALESCE((_permissions->>'can_manage_products')::BOOLEAN, false),
    COALESCE((_permissions->>'can_view_financeiro')::BOOLEAN, false),
    COALESCE((_permissions->>'can_manage_financeiro')::BOOLEAN, false),
    COALESCE((_permissions->>'can_view_transactions')::BOOLEAN, false),
    COALESCE((_permissions->>'can_manage_integrations')::BOOLEAN, false),
    COALESCE((_permissions->>'can_manage_settings')::BOOLEAN, false),
    now() -- Auto-aceitar por enquanto
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Função para atualizar permissões do colaborador
CREATE OR REPLACE FUNCTION public.update_collaborator_permissions(
  _collaborator_id UUID,
  _permissions JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Atualizar permissões (apenas se for o owner)
  UPDATE collaborator_permissions
  SET 
    can_view_dashboard = COALESCE((_permissions->>'can_view_dashboard')::BOOLEAN, can_view_dashboard),
    can_manage_checkout = COALESCE((_permissions->>'can_manage_checkout')::BOOLEAN, can_manage_checkout),
    can_manage_products = COALESCE((_permissions->>'can_manage_products')::BOOLEAN, can_manage_products),
    can_view_financeiro = COALESCE((_permissions->>'can_view_financeiro')::BOOLEAN, can_view_financeiro),
    can_manage_financeiro = COALESCE((_permissions->>'can_manage_financeiro')::BOOLEAN, can_manage_financeiro),
    can_view_transactions = COALESCE((_permissions->>'can_view_transactions')::BOOLEAN, can_view_transactions),
    can_manage_integrations = COALESCE((_permissions->>'can_manage_integrations')::BOOLEAN, can_manage_integrations),
    can_manage_settings = COALESCE((_permissions->>'can_manage_settings')::BOOLEAN, can_manage_settings),
    updated_at = now()
  WHERE id = _collaborator_id AND owner_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Função para remover colaborador
CREATE OR REPLACE FUNCTION public.remove_collaborator(_collaborator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Deletar colaborador (apenas se for o owner)
  DELETE FROM collaborator_permissions
  WHERE id = _collaborator_id AND owner_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Função para obter colaboradores do usuário atual
CREATE OR REPLACE FUNCTION public.get_my_collaborators()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  can_view_dashboard BOOLEAN,
  can_manage_checkout BOOLEAN,
  can_manage_products BOOLEAN,
  can_view_financeiro BOOLEAN,
  can_manage_financeiro BOOLEAN,
  can_view_transactions BOOLEAN,
  can_manage_integrations BOOLEAN,
  can_manage_settings BOOLEAN,
  is_active BOOLEAN,
  notes TEXT,
  invited_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
  SELECT 
    cp.id,
    cp.user_id,
    au.email::TEXT as user_email,
    p.full_name as user_name,
    cp.can_view_dashboard,
    cp.can_manage_checkout,
    cp.can_manage_products,
    cp.can_view_financeiro,
    cp.can_manage_financeiro,
    cp.can_view_transactions,
    cp.can_manage_integrations,
    cp.can_manage_settings,
    cp.is_active,
    cp.notes,
    cp.invited_at,
    cp.accepted_at
  FROM collaborator_permissions cp
  JOIN auth.users au ON au.id = cp.user_id
  LEFT JOIN profiles p ON p.id = cp.user_id
  WHERE cp.owner_id = auth.uid()
  ORDER BY cp.created_at DESC;
END;
$$;

-- Função para obter minhas permissões como colaborador
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(
  id UUID,
  owner_id UUID,
  owner_email TEXT,
  owner_name TEXT,
  can_view_dashboard BOOLEAN,
  can_manage_checkout BOOLEAN,
  can_manage_products BOOLEAN,
  can_view_financeiro BOOLEAN,
  can_manage_financeiro BOOLEAN,
  can_view_transactions BOOLEAN,
  can_manage_integrations BOOLEAN,
  can_manage_settings BOOLEAN,
  is_active BOOLEAN,
  is_collaborator BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collab_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Buscar se é colaborador
  SELECT * INTO collab_record
  FROM collaborator_permissions cp
  WHERE cp.user_id = auth.uid() AND cp.is_active = true
  LIMIT 1;
  
  -- Se não é colaborador, retorna permissões totais (é owner)
  IF collab_record IS NULL THEN
    RETURN QUERY
    SELECT 
      NULL::UUID as id,
      auth.uid() as owner_id,
      NULL::TEXT as owner_email,
      NULL::TEXT as owner_name,
      true as can_view_dashboard,
      true as can_manage_checkout,
      true as can_manage_products,
      true as can_view_financeiro,
      true as can_manage_financeiro,
      true as can_view_transactions,
      true as can_manage_integrations,
      true as can_manage_settings,
      true as is_active,
      false as is_collaborator;
  ELSE
    -- Retorna permissões do colaborador
    RETURN QUERY
    SELECT 
      collab_record.id,
      collab_record.owner_id,
      au.email::TEXT as owner_email,
      p.full_name as owner_name,
      collab_record.can_view_dashboard,
      collab_record.can_manage_checkout,
      collab_record.can_manage_products,
      collab_record.can_view_financeiro,
      collab_record.can_manage_financeiro,
      collab_record.can_view_transactions,
      collab_record.can_manage_integrations,
      collab_record.can_manage_settings,
      collab_record.is_active,
      true as is_collaborator
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    WHERE au.id = collab_record.owner_id;
  END IF;
END;
$$;