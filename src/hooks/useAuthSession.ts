import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';

// Hook otimizado para sessão - evita re-fetch a cada navegação
export const useAuthSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listener de auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Invalida cache quando auth muda
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          queryClient.invalidateQueries({ queryKey: ['auth'] });
        }
      }
    );

    // Check sessão existente
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return { session, user, loading };
};

// Hook para status do usuário (blocked, admin, approved) - CACHEADO
export const useUserStatus = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  
  // Use uma queryKey estável - sempre inclui userId (ou 'anonymous')
  const stableUserId = userId || 'anonymous';
  const enabled = !!userId;

  const blockedQuery = useQuery({
    queryKey: ['auth', 'blocked', stableUserId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc('check_user_blocked' as any);
      if (error) throw error;
      return data === true;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });

  const adminQuery = useQuery({
    queryKey: ['auth', 'admin', stableUserId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc('is_admin_authenticated');
      if (error) throw error;
      return data === true;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });

  const approvedQuery = useQuery({
    queryKey: ['auth', 'approved', stableUserId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc('check_user_approved' as any);
      if (error) throw error;
      return data === true;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });

  const refresh = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: ['auth', 'blocked', userId] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'admin', userId] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'approved', userId] });
  }, [queryClient, userId]);

  // Retorna valores memoizados para evitar re-renders desnecessários
  const isBlocked = blockedQuery.data ?? false;
  const isAdmin = adminQuery.data ?? false;
  const isApproved = approvedQuery.data ?? false;
  const loading = enabled && (blockedQuery.isLoading || adminQuery.isLoading || approvedQuery.isLoading);

  return useMemo(() => ({
    isBlocked,
    isAdmin,
    isApproved,
    loading,
    refresh,
  }), [isBlocked, isAdmin, isApproved, loading, refresh]);
};

// Hook para billing progress - CACHEADO
export const useBillingProgress = (userId: string | undefined) => {
  const stableUserId = userId || 'anonymous';
  
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'progress', stableUserId],
    queryFn: async () => {
      if (!userId) return { currentAmount: 0, goalAmount: 1000000 };
      const [dashboardRes, goalRes] = await Promise.all([
        supabase.rpc('get_user_dashboard_v2'),
        supabase.rpc('get_global_billing_goal'),
      ]);

      const currentAmount = (dashboardRes.data as any)?.total_amount_paid || 0;
      const goalAmount = goalRes.data || 1000000;

      return { currentAmount, goalAmount };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });

  return {
    currentAmount: data?.currentAmount ?? 0,
    goalAmount: data?.goalAmount ?? 1000000,
    loading: isLoading,
  };
};
