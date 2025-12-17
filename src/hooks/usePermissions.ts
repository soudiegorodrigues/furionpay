import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Permissions {
  id: string | null;
  owner_id: string;
  owner_email: string | null;
  owner_name: string | null;
  can_view_dashboard: boolean;
  can_manage_checkout: boolean;
  can_manage_products: boolean;
  can_view_financeiro: boolean;
  can_manage_financeiro: boolean;
  can_view_transactions: boolean;
  can_manage_integrations: boolean;
  can_manage_settings: boolean;
  is_active: boolean;
  is_collaborator: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermissions(null);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('get_my_permissions');

      if (rpcError) {
        console.error('Error loading permissions:', rpcError);
        setError(rpcError.message);
        // Default to owner permissions if error
        setPermissions({
          id: null,
          owner_id: user.id,
          owner_email: null,
          owner_name: null,
          can_view_dashboard: true,
          can_manage_checkout: true,
          can_manage_products: true,
          can_view_financeiro: true,
          can_manage_financeiro: true,
          can_view_transactions: true,
          can_manage_integrations: true,
          can_manage_settings: true,
          is_active: true,
          is_collaborator: false,
        });
        return;
      }

      if (data && data.length > 0) {
        setPermissions(data[0] as Permissions);
      }
    } catch (err) {
      console.error('Error in usePermissions:', err);
      setError('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPermissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (permission: keyof Omit<Permissions, 'id' | 'owner_id' | 'owner_email' | 'owner_name' | 'is_active' | 'is_collaborator'>): boolean => {
    if (!permissions) return false;
    if (!permissions.is_collaborator) return true; // Owner has all permissions
    return permissions[permission] ?? false;
  };

  const isOwner = !permissions?.is_collaborator;
  const isCollaborator = permissions?.is_collaborator ?? false;

  return {
    permissions,
    loading,
    error,
    hasPermission,
    isOwner,
    isCollaborator,
    refresh: loadPermissions,
  };
};
