import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Users, Loader2, RefreshCw, ChevronLeft, ChevronRight, Search, Pencil, 
  Shield, ShieldOff, Ban, Unlock, Trash2, Check, CreditCard, UserCheck, UserX, Percent, Trophy 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  full_name: string | null;
  is_approved: boolean;
  available_balance?: number;
  is_manual_acquirer?: boolean;
}

interface FeeConfig {
  id: string;
  name: string;
  pix_percentage: number;
  pix_fixed: number;
  is_default: boolean;
}

interface Reward {
  id: string;
  name: string;
  image_url: string | null;
  threshold_amount: number;
}

const USERS_PER_PAGE = 10;

export const UsuariosSection = () => {
  const { user: currentUser } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userAcquirers, setUserAcquirers] = useState<Record<string, string>>({});
  const [userManualAcquirers, setUserManualAcquirers] = useState<Record<string, boolean>>({});
  const [defaultAcquirer, setDefaultAcquirer] = useState<string>('ativus');
  const [userFeeConfigs, setUserFeeConfigs] = useState<Record<string, string>>({});
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserAcquirer, setSelectedUserAcquirer] = useState<string>('spedpay');
  const [selectedUserFeeConfig, setSelectedUserFeeConfig] = useState<string>('');
  const [isSavingUserSettings, setIsSavingUserSettings] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [userToPromote, setUserToPromote] = useState<User | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userTotalPaid, setUserTotalPaid] = useState(0);

  useEffect(() => {
    loadUsers();
    loadFeeConfigs();
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('id, name, image_url, threshold_amount')
        .eq('is_active', true)
        .order('threshold_amount', { ascending: true });
      if (error) throw error;
      setRewards(data || []);
    } catch (error: any) {
      console.error('Error loading rewards:', error);
    }
  };

  const loadFeeConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_configs')
        .select('id, name, pix_percentage, pix_fixed, is_default')
        .order('name');
      if (error) throw error;
      setFeeConfigs(data || []);
    } catch (error: any) {
      console.error('Error loading fee configs:', error);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_auth');
      if (error) throw error;

      // Load balances for all users
      const usersWithBalances = await Promise.all(
        (data || []).map(async (user: User) => {
          try {
            const { data: balanceData } = await supabase.rpc('get_user_available_balance_admin', {
              p_user_id: user.id,
            });
            return { ...user, available_balance: balanceData || 0 };
          } catch {
            return { ...user, available_balance: 0 };
          }
        })
      );

      setUsers(usersWithBalances);

      const [
        { data: acquirerData, error: acquirerError },
        { data: manualData, error: manualError },
        { data: feeConfigData, error: feeError },
        { data: defaultAcqData, error: defaultError },
      ] = await Promise.all([
        supabase.from('admin_settings').select('user_id, value').eq('key', 'user_acquirer'),
        supabase.from('admin_settings').select('user_id, value').eq('key', 'user_acquirer_is_manual'),
        supabase.from('admin_settings').select('user_id, value').eq('key', 'user_fee_config'),
        supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'default_acquirer')
          .is('user_id', null)
          .maybeSingle(),
      ]);

      if (acquirerError) throw acquirerError;
      if (manualError) throw manualError;
      if (feeError) throw feeError;
      if (defaultError) throw defaultError;

      const platformDefaultAcquirer = defaultAcqData?.value || 'ativus';
      setDefaultAcquirer(platformDefaultAcquirer);

      const acquirersMap: Record<string, string> = {};
      (acquirerData || []).forEach((item) => {
        if (item.user_id) {
          acquirersMap[item.user_id] = item.value || 'spedpay';
        }
      });

      const manualMap: Record<string, boolean> = {};
      (manualData || []).forEach((item) => {
        if (item.user_id) {
          manualMap[item.user_id] = item.value === 'true';
        }
      });

      const feeConfigsMap: Record<string, string> = {};
      (feeConfigData || []).forEach((item) => {
        if (item.user_id) {
          feeConfigsMap[item.user_id] = item.value || '';
        }
      });

      // Auto-cleanup: remove obsolete manual flags when user is on the platform default acquirer
      const usersToCleanup = Object.keys(manualMap).filter((userId) => {
        if (!manualMap[userId]) return false;
        const userAcquirer = acquirersMap[userId] || platformDefaultAcquirer;
        return userAcquirer === platformDefaultAcquirer;
      });

      if (usersToCleanup.length > 0) {
        await Promise.all(
          usersToCleanup.map((userId) =>
            supabase
              .from('admin_settings')
              .delete()
              .eq('user_id', userId)
              .in('key', ['user_acquirer_is_manual', 'user_acquirer'])
          )
        );

        usersToCleanup.forEach((userId) => {
          delete manualMap[userId];
          if (acquirersMap[userId] === platformDefaultAcquirer) {
            delete acquirersMap[userId];
          }
        });
      }

      setUserAcquirers(acquirersMap);
      setUserManualAcquirers(manualMap);
      setUserFeeConfigs(feeConfigsMap);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFeeConfigName = (userId: string) => {
    const feeConfigId = userFeeConfigs[userId];
    if (!feeConfigId) {
      const defaultConfig = feeConfigs.find(fc => fc.is_default);
      return defaultConfig ? `${defaultConfig.name} (Padrão)` : 'Padrão';
    }
    const config = feeConfigs.find(fc => fc.id === feeConfigId);
    return config ? config.name : 'Padrão';
  };

  const openAdminDialog = (u: User) => {
    setUserToPromote(u);
    setAdminDialogOpen(true);
  };

  const handleGrantAdmin = async () => {
    if (!userToPromote) return;
    try {
      setActionLoading(userToPromote.id);
      const { error } = await supabase.rpc('grant_admin_role', { target_user_id: userToPromote.id });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Permissão de admin concedida' });
      setAdminDialogOpen(false);
      setUserToPromote(null);
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao conceder permissão', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase.rpc('revoke_admin_role', { target_user_id: userId });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Permissão de admin revogada' });
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao revogar permissão', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase.rpc('block_user' as any, { target_user_id: userId });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Usuário bloqueado' });
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao bloquear usuário', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase.rpc('unblock_user' as any, { target_user_id: userId });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Usuário desbloqueado' });
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao desbloquear usuário', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setActionLoading(userToDelete.id);
      const { error } = await supabase.rpc('delete_user' as any, { target_user_id: userToDelete.id });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Usuário excluído permanentemente' });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao excluir usuário', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveUser = async (userId: string) => {
    const userToApprove = users.find(u => u.id === userId);
    try {
      setActionLoading(userId);
      const { error } = await supabase.rpc('approve_user' as any, { target_user_id: userId });
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u));
      
      if (userToApprove) {
        supabase.functions.invoke('send-approval-notification', {
          body: {
            userId: userId,
            userEmail: userToApprove.email,
            userName: userToApprove.full_name
          }
        }).catch(emailError => {
          console.error('Failed to send approval notification:', emailError);
        });
      }
      
      toast({ title: 'Sucesso', description: 'Usuário aprovado com sucesso' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao aprovar usuário', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeApproval = async (userId: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase.rpc('revoke_user_approval' as any, { target_user_id: userId });
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: false } : u));
      
      toast({ title: 'Sucesso', description: 'Aprovação revogada' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao revogar aprovação', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteDialog = (u: User) => {
    setUserToDelete(u);
    setDeleteDialogOpen(true);
  };

  const openUserDetails = async (u: User) => {
    setSelectedUser(u);
    setUserDetailsOpen(true);
    setUserTotalPaid(0);
    try {
      const { data: acquirerData, error: acquirerError } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('user_id', u.id)
        .eq('key', 'user_acquirer')
        .maybeSingle();
      if (acquirerError) throw acquirerError;

      setSelectedUserAcquirer(acquirerData?.value || defaultAcquirer);

      const { data: feeData, error: feeError } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('user_id', u.id)
        .eq('key', 'user_fee_config')
        .maybeSingle();
      if (feeError) throw feeError;

      setSelectedUserFeeConfig(feeData?.value || '');

      // Fetch user total paid amount
      const { data: transactionData } = await supabase
        .from('pix_transactions')
        .select('amount')
        .eq('user_id', u.id)
        .eq('status', 'paid');

      if (transactionData) {
        const total = transactionData.reduce((sum, t) => sum + (t.amount || 0), 0);
        setUserTotalPaid(total);
      }
    } catch {
      setSelectedUserAcquirer(defaultAcquirer);
      setSelectedUserFeeConfig('');
    }
  };

  const saveUserSettings = async () => {
    if (!selectedUser) return;
    setIsSavingUserSettings(true);
    try {
      // Check if selected acquirer matches platform default
      const isMatchingDefault = selectedUserAcquirer === defaultAcquirer;

      if (isMatchingDefault) {
        // Remove manual flag and user_acquirer - user is using platform default
        await supabase
          .from('admin_settings')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('key', 'user_acquirer_is_manual');
        
        await supabase
          .from('admin_settings')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('key', 'user_acquirer');
      } else {
        // Save acquirer
        const { error: acquirerError } = await supabase
          .from('admin_settings')
          .upsert({
            user_id: selectedUser.id,
            key: 'user_acquirer',
            value: selectedUserAcquirer,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key,user_id' });
        if (acquirerError) throw acquirerError;

        // Mark as manual override - this user won't be affected by "Adquirente principal" changes
        const { error: manualError } = await supabase
          .from('admin_settings')
          .upsert({
            user_id: selectedUser.id,
            key: 'user_acquirer_is_manual',
            value: 'true',
            updated_at: new Date().toISOString()
          }, { onConflict: 'key,user_id' });
        if (manualError) throw manualError;
      }

      // Save fee config
      if (selectedUserFeeConfig) {
        const { error: feeError } = await supabase
          .from('admin_settings')
          .upsert({
            user_id: selectedUser.id,
            key: 'user_fee_config',
            value: selectedUserFeeConfig,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key,user_id' });
        if (feeError) throw feeError;
      } else {
        // Remove fee config if empty (use default)
        await supabase
          .from('admin_settings')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('key', 'user_fee_config');
      }

      // Update local state based on whether it's manual or default
      if (isMatchingDefault) {
        setUserAcquirers(prev => {
          const newState = { ...prev };
          delete newState[selectedUser.id];
          return newState;
        });
        setUserManualAcquirers(prev => {
          const newState = { ...prev };
          delete newState[selectedUser.id];
          return newState;
        });
      } else {
        setUserAcquirers(prev => ({ ...prev, [selectedUser.id]: selectedUserAcquirer }));
        setUserManualAcquirers(prev => ({ ...prev, [selectedUser.id]: true }));
      }
      
      setUserFeeConfigs(prev => {
        const newState = { ...prev };
        if (selectedUserFeeConfig) {
          newState[selectedUser.id] = selectedUserFeeConfig;
        } else {
          delete newState[selectedUser.id];
        }
        return newState;
      });

      const successMessage = isMatchingDefault 
        ? 'Configurações atualizadas (usando padrão da plataforma)' 
        : 'Configurações atualizadas (override manual ativado)';
      toast({ title: 'Sucesso', description: successMessage });
      setUserDetailsOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSavingUserSettings(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Filtrar por busca se houver
    if (userSearch.trim()) {
      const search = userSearch.toLowerCase().trim();
      result = result.filter(u => 
        u.email.toLowerCase().includes(search) || 
        (u.full_name && u.full_name.toLowerCase().includes(search))
      );
    }
    
    // Ordenar: usuário atual primeiro, depois admins, depois por data de cadastro (mais recente)
    return [...result].sort((a, b) => {
      // Usuário atual sempre em primeiro
      if (currentUser?.id === a.id) return -1;
      if (currentUser?.id === b.id) return 1;
      // Depois admins
      if (a.is_admin && !b.is_admin) return -1;
      if (!a.is_admin && b.is_admin) return 1;
      // Por fim, por data de cadastro (mais recente primeiro)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [users, userSearch, currentUser?.id]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Gerenciar Usuários
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{filteredUsers.length} de {users.length} usuário(s)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading} className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 w-full sm:max-w-sm h-8 text-sm"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Cadastro</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Adquirente</TableHead>
                      <TableHead className="text-xs hidden xl:table-cell">Taxa</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Saldo Disponível</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum usuário cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-xs max-w-[180px] truncate">{u.email}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell whitespace-nowrap">{formatDate(u.created_at)}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 capitalize">
                                {(() => {
                                  const acq = userAcquirers[u.id] || defaultAcquirer;
                                  return acq === 'inter' ? 'Banco Inter' : acq === 'ativus' ? 'Ativus Hub' : acq === 'valorion' ? 'Valorion' : 'SpedPay';
                                })()}
                              </Badge>
                              {userManualAcquirers[u.id] && (
                                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px] px-1">
                                  Manual
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs hidden xl:table-cell">
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              <Percent className="h-3 w-3 mr-1" />
                              {getFeeConfigName(u.id)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs hidden sm:table-cell whitespace-nowrap font-medium text-green-600 dark:text-green-400">
                            R$ {(u.available_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {u.is_blocked ? (
                                <Badge variant="destructive" className="text-[10px] px-1.5">Bloq.</Badge>
                              ) : u.is_admin ? (
                                <Badge className="bg-primary text-[10px] px-1.5">Admin</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5">User</Badge>
                              )}
                              {!u.is_admin && (
                                u.is_approved ? (
                                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[10px] px-1.5">Aprovado</Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px] px-1.5">Pendente</Badge>
                                )
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {u.id === currentUser?.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openUserDetails(u)} title="Editar">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <span className="text-xs text-muted-foreground ml-1">Você</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openUserDetails(u)} title="Editar">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                {!u.is_admin && (
                                  u.is_approved ? (
                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleRevokeApproval(u.id)} disabled={actionLoading === u.id} title="Revogar Aprovação">
                                      {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
                                    </Button>
                                  ) : (
                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700 border-green-500/50 hover:bg-green-50 dark:hover:bg-green-950" onClick={() => handleApproveUser(u.id)} disabled={actionLoading === u.id} title="Aprovar Usuário">
                                      {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                                    </Button>
                                  )
                                )}
                                {u.is_admin ? (
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleRevokeAdmin(u.id)} disabled={actionLoading === u.id} title="Revogar Admin">
                                    {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                                  </Button>
                                ) : (
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openAdminDialog(u)} disabled={actionLoading === u.id} title="Tornar Admin">
                                    {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                                  </Button>
                                )}
                                {u.is_blocked ? (
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleUnblockUser(u.id)} disabled={actionLoading === u.id} title="Desbloquear">
                                    {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                                  </Button>
                                ) : (
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 hidden sm:flex" onClick={() => handleBlockUser(u.id)} disabled={actionLoading === u.id} title="Bloquear">
                                    {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                                  </Button>
                                )}
                                <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => openDeleteDialog(u)} disabled={actionLoading === u.id} title="Excluir">
                                  {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {((currentPage - 1) * USERS_PER_PAGE) + 1}-{Math.min(currentPage * USERS_PER_PAGE, users.length)} de {users.length}
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs sm:text-sm text-muted-foreground px-2">
                      {currentPage}/{totalPages}
                    </span>
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente o usuário <strong>{userToDelete?.email}</strong>? 
              Esta ação não pode ser desfeita e todos os dados do usuário serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote to Admin Dialog */}
      <AlertDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promover para Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja promover <strong>{userToPromote?.email}</strong> para Administrador? 
              Este usuário terá acesso completo ao painel administrativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGrantAdmin}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>Configure as opções do usuário</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {selectedUser.full_name?.[0]?.toUpperCase() || selectedUser.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg truncate">
                    {selectedUser.full_name || selectedUser.email.split('@')[0]}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                  <div className="flex gap-2 mt-1">
                    {selectedUser.is_admin ? (
                      <Badge className="bg-primary text-[10px]">Admin</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">User</Badge>
                    )}
                    {selectedUser.is_blocked ? (
                      <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Ativo</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Cadastro</p>
                  <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Último Acesso</p>
                  <p className="font-medium">{formatDate(selectedUser.last_sign_in_at)}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Adquirente</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione qual gateway de pagamento este usuário irá utilizar
                </p>
                <Select value={selectedUserAcquirer} onValueChange={setSelectedUserAcquirer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o adquirente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spedpay">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-primary/10 rounded flex items-center justify-center">
                          <CreditCard className="w-3 h-3 text-primary" />
                        </div>
                        SpedPay
                      </div>
                    </SelectItem>
                    <SelectItem value="inter">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500/10 rounded flex items-center justify-center text-orange-500 text-[10px] font-bold">I</div>
                        Banco Inter
                      </div>
                    </SelectItem>
                    <SelectItem value="ativus">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500/10 rounded flex items-center justify-center text-purple-500 text-[10px] font-bold">A</div>
                        Ativus Hub
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Configuração de Taxa</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione qual taxa será aplicada às transações deste usuário
                </p>
                <Select value={selectedUserFeeConfig || 'default'} onValueChange={(val) => setSelectedUserFeeConfig(val === 'default' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Usar taxa padrão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      <div className="flex items-center gap-2">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        Usar taxa padrão
                      </div>
                    </SelectItem>
                    {feeConfigs.filter(fc => fc.id).map(fc => (
                      <SelectItem key={fc.id} value={fc.id}>
                        <div className="flex items-center gap-2">
                          <Percent className="w-3 h-3 text-primary" />
                          {fc.name} ({fc.pix_percentage}% + R$ {fc.pix_fixed.toFixed(2)})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rewards Progress Section */}
              {rewards.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Progresso de Recompensas
                  </Label>
                  
                  {rewards.map(reward => {
                    const progress = Math.min((userTotalPaid / reward.threshold_amount) * 100, 100);
                    const achieved = userTotalPaid >= reward.threshold_amount;
                    
                    return (
                      <div key={reward.id} className="p-4 rounded-xl border bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/20">
                        {/* Imagem da placa em destaque */}
                        <div className="flex justify-center mb-4">
                          <div className="w-32 h-32 rounded-lg bg-white/50 dark:bg-black/20 p-2 shadow-sm">
                            {reward.image_url ? (
                              <img src={reward.image_url} alt={reward.name} className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Trophy className="h-12 w-12 text-amber-500" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Nome e Status */}
                        <div className="text-center mb-3">
                          <h4 className="font-bold text-base">{reward.name}</h4>
                          {achieved ? (
                            <Badge className="bg-green-500 text-white mt-1">🎉 Conquistado!</Badge>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                              Faltam <span className="font-semibold text-amber-600 dark:text-amber-400">R$ {(reward.threshold_amount - userTotalPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </p>
                          )}
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="space-y-1.5">
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${achieved ? 'bg-green-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          
                          {/* Valores */}
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">R$ {userTotalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-muted-foreground">Meta: R$ {reward.threshold_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDetailsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveUserSettings} disabled={isSavingUserSettings}>
              {isSavingUserSettings ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
