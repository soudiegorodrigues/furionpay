import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

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

const defaultOwnerPermissions = (userId: string): Permissions => ({
  id: null,
  owner_id: userId,
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

export const usePermissions = () => {
  const queryClient = useQueryClient();

  const { data: permissions, isLoading: loading, error } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error: rpcError } = await supabase.rpc('get_my_permissions');

      if (rpcError) {
        console.error('Error loading permissions:', rpcError);
        return defaultOwnerPermissions(user.id);
      }

      if (data && data.length > 0) {
        return data[0] as Permissions;
      }

      return defaultOwnerPermissions(user.id);
    },
    staleTime: 1000 * 60 * 5, // 5 minutos - não re-fetch a cada navegação
    gcTime: 1000 * 60 * 10,
  });

  const hasPermission = useCallback((permission: keyof Omit<Permissions, 'id' | 'owner_id' | 'owner_email' | 'owner_name' | 'is_active' | 'is_collaborator'>): boolean => {
    if (!permissions) return false;
    if (!permissions.is_collaborator) return true; // Owner has all permissions
    return permissions[permission] ?? false;
  }, [permissions]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['permissions'] });
  }, [queryClient]);

  const isOwner = !permissions?.is_collaborator;
  const isCollaborator = permissions?.is_collaborator ?? false;

  return {
    permissions: permissions ?? null,
    loading,
    error: error?.message ?? null,
    hasPermission,
    isOwner,
    isCollaborator,
    refresh,
  };
};
