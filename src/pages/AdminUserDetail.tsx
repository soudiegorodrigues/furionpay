import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, Loader2, Check, CreditCard, Settings2, Percent, Trophy, ShieldCheck,
  Shield, ShieldOff, Ban, Unlock, Trash2, UserCheck, UserX, Mail, Calendar, Clock, Wallet, KeyRound, BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminHeader } from "@/components/AdminSidebar";
import { ReconcileSalesSection } from "@/components/admin/ReconcileSalesSection";

interface User2FAStatus {
  hasTOTP: boolean;
  factorId?: string;
}

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
  bypass_antifraud?: boolean;
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

interface VerificationStatus {
  status: string;
  person_type: string;
  document_type: string;
}

const AdminUserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAdminAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [defaultAcquirer, setDefaultAcquirer] = useState<string>('ativus');
  
  const [selectedAcquirer, setSelectedAcquirer] = useState<string>('');
  const [selectedFeeConfig, setSelectedFeeConfig] = useState<string>('');
  const [bypassAntifraud, setBypassAntifraud] = useState(false);
  const [userTotalPaid, setUserTotalPaid] = useState(0);
  const [userTotalLiquid, setUserTotalLiquid] = useState(0);
  const [userTotalWithdrawn, setUserTotalWithdrawn] = useState(0);
  const [userTotalPending, setUserTotalPending] = useState(0);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [user2FAStatus, setUser2FAStatus] = useState<User2FAStatus | null>(null);
  const [reset2FADialogOpen, setReset2FADialogOpen] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadUserDetails();
      loadFeeConfigs();
      loadRewards();
      loadDefaultAcquirer();
      loadUser2FAStatus();
    }
  }, [id]);

  const loadUser2FAStatus = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.rpc('admin_can_reset_2fa', { p_user_id: id });
      setUser2FAStatus({ hasTOTP: data === true });
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      setUser2FAStatus({ hasTOTP: false });
    }
  };

  const handleReset2FA = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-2fa', {
        body: { targetUserId: user.id }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Erro ao resetar 2FA');
      }

      setUser2FAStatus({ hasTOTP: false });
      setReset2FADialogOpen(false);
      toast({ title: 'Sucesso', description: '2FA do usuário foi desativado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const loadDefaultAcquirer = async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'default_acquirer')
        .is('user_id', null)
        .maybeSingle();
      setDefaultAcquirer(data?.value || 'ativus');
    } catch {
      setDefaultAcquirer('ativus');
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

  const loadUserDetails = async () => {
    setIsLoading(true);
    try {
      // Get user details
      const { data: usersData, error: usersError } = await supabase.rpc('get_all_users_auth');
      if (usersError) throw usersError;

      const userData = (usersData || []).find((u: User) => u.id === id);
      if (!userData) {
        toast({ title: 'Erro', description: 'Usuário não encontrado', variant: 'destructive' });
        navigate('/admin');
        return;
      }

      // Get balance
      const { data: balanceData } = await supabase.rpc('get_user_available_balance_admin', {
        p_user_id: id,
      });

      setUser({ ...userData, available_balance: balanceData || 0 });

      // Load user settings
      const [
        { data: acquirerData },
        { data: feeData },
        { data: profileData },
        { data: totalPaid },
        { data: verificationData },
        { data: transactionsData },
        { data: withdrawalsData },
        { data: pendingWithdrawalsData }
      ] = await Promise.all([
        supabase.from('admin_settings').select('value').eq('user_id', id).eq('key', 'user_acquirer').maybeSingle(),
        supabase.from('admin_settings').select('value').eq('user_id', id).eq('key', 'user_fee_config').maybeSingle(),
        supabase.from('profiles').select('bypass_antifraud').eq('id', id).maybeSingle(),
        supabase.rpc('get_user_total_paid', { p_user_id: id }),
        supabase.from('user_verification').select('status, person_type, document_type_selected').eq('user_id', id).maybeSingle(),
        supabase.from('pix_transactions').select('amount, fee_fixed, fee_percentage').eq('user_id', id).eq('status', 'paid'),
        supabase.from('withdrawal_requests').select('gross_amount').eq('user_id', id).eq('status', 'approved'),
        supabase.from('withdrawal_requests').select('gross_amount').eq('user_id', id).eq('status', 'pending')
      ]);

      setSelectedAcquirer(acquirerData?.value || '');
      setSelectedFeeConfig(feeData?.value || '');
      setBypassAntifraud(profileData?.bypass_antifraud || false);
      setUserTotalPaid(totalPaid || 0);
      
      // Calculate total liquid (amount - fees)
      const totalLiquid = (transactionsData || []).reduce((sum, tx) => {
        const feeFixed = tx.fee_fixed || 0;
        const feePercentage = tx.fee_percentage || 0;
        const fee = feeFixed + (tx.amount * feePercentage / 100);
        return sum + (tx.amount - fee);
      }, 0);
      setUserTotalLiquid(totalLiquid);
      
      // Calculate total withdrawn
      const totalWithdrawn = (withdrawalsData || []).reduce((sum, w) => sum + (w.gross_amount || 0), 0);
      setUserTotalWithdrawn(totalWithdrawn);
      
      // Calculate total pending withdrawals
      const totalPending = (pendingWithdrawalsData || []).reduce((sum, w) => sum + (w.gross_amount || 0), 0);
      setUserTotalPending(totalPending);
      
      setVerification(verificationData ? {
        status: verificationData.status,
        person_type: verificationData.person_type,
        document_type: verificationData.document_type_selected
      } : null);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao carregar usuário', variant: 'destructive' });
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserSettings = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const isUsingDefault = !selectedAcquirer || selectedAcquirer === defaultAcquirer;

      if (isUsingDefault) {
        await supabase.from('admin_settings').delete().eq('user_id', user.id).eq('key', 'user_acquirer_is_manual');
        await supabase.from('admin_settings').delete().eq('user_id', user.id).eq('key', 'user_acquirer');
      } else {
        const { error: acquirerError } = await supabase
          .from('admin_settings')
          .upsert({
            user_id: user.id,
            key: 'user_acquirer',
            value: selectedAcquirer,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key,user_id' });
        if (acquirerError) throw acquirerError;

        const { error: manualError } = await supabase
          .from('admin_settings')
          .upsert({
            user_id: user.id,
            key: 'user_acquirer_is_manual',
            value: 'true',
            updated_at: new Date().toISOString()
          }, { onConflict: 'key,user_id' });
        if (manualError) throw manualError;
      }

      if (selectedFeeConfig) {
        const { error: feeError } = await supabase
          .from('admin_settings')
          .upsert({
            user_id: user.id,
            key: 'user_fee_config',
            value: selectedFeeConfig,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key,user_id' });
        if (feeError) throw feeError;
      } else {
        await supabase.from('admin_settings').delete().eq('user_id', user.id).eq('key', 'user_fee_config');
      }

      await supabase.rpc('set_user_antifraud_bypass', {
        p_user_id: user.id,
        p_bypass: bypassAntifraud
      });

      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveUser = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('approve_user' as any, { target_user_id: user.id });
      if (error) throw error;
      setUser(prev => prev ? { ...prev, is_approved: true } : null);
      
      supabase.functions.invoke('send-approval-notification', {
        body: { userId: user.id, userEmail: user.email, userName: user.full_name }
      }).catch(console.error);
      
      toast({ title: 'Sucesso', description: 'Usuário aprovado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeApproval = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('revoke_user_approval' as any, { target_user_id: user.id });
      if (error) throw error;
      setUser(prev => prev ? { ...prev, is_approved: false } : null);
      toast({ title: 'Sucesso', description: 'Aprovação revogada' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantAdmin = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('grant_admin_role', { target_user_id: user.id });
      if (error) throw error;
      setUser(prev => prev ? { ...prev, is_admin: true } : null);
      setAdminDialogOpen(false);
      toast({ title: 'Sucesso', description: 'Permissão de admin concedida' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAdmin = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('revoke_admin_role', { target_user_id: user.id });
      if (error) throw error;
      setUser(prev => prev ? { ...prev, is_admin: false } : null);
      toast({ title: 'Sucesso', description: 'Permissão de admin revogada' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('block_user' as any, { target_user_id: user.id });
      if (error) throw error;
      setUser(prev => prev ? { ...prev, is_blocked: true } : null);
      toast({ title: 'Sucesso', description: 'Usuário bloqueado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('unblock_user' as any, { target_user_id: user.id });
      if (error) throw error;
      setUser(prev => prev ? { ...prev, is_blocked: false } : null);
      toast({ title: 'Sucesso', description: 'Usuário desbloqueado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user' as any, { target_user_id: user.id });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Usuário excluído permanentemente' });
      navigate('/admin');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getVerificationBadge = () => {
    if (!verification) return <Badge variant="outline" className="text-muted-foreground">Sem documentos</Badge>;
    switch (verification.status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Aprovado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pendente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <AdminHeader title="Detalhes do Usuário" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isCurrentUser = currentUser?.id === user.id;

  return (
    <div className="p-4 md:p-6">
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin', { state: { section: 'usuarios' } })} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Usuários
        </Button>

        {/* User Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-semibold">
                    {user.full_name || user.email.split('@')[0]}
                  </h1>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {user.is_admin ? (
                      <Badge className="bg-primary">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">Usuário</Badge>
                    )}
                    {user.is_blocked ? (
                      <Badge variant="destructive">Bloqueado</Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ativo</Badge>
                    )}
                    {!user.is_admin && (
                      user.is_approved ? (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Aprovado</Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pendente</Badge>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {!isCurrentUser && (
                <div className="flex gap-2 flex-wrap">
                  {!user.is_admin && (
                    user.is_approved ? (
                      <Button variant="outline" size="sm" onClick={handleRevokeApproval} disabled={actionLoading}>
                        <UserX className="h-4 w-4 mr-2" />
                        Revogar Aprovação
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleApproveUser} disabled={actionLoading} className="text-green-600 border-green-500/50 hover:bg-green-50 dark:hover:bg-green-950">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                    )
                  )}
                  {user.is_admin ? (
                    <Button variant="outline" size="sm" onClick={handleRevokeAdmin} disabled={actionLoading}>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Revogar Admin
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setAdminDialogOpen(true)} disabled={actionLoading}>
                      <Shield className="h-4 w-4 mr-2" />
                      Tornar Admin
                    </Button>
                  )}
                  {user.is_blocked ? (
                    <Button variant="outline" size="sm" onClick={handleUnblockUser} disabled={actionLoading}>
                      <Unlock className="h-4 w-4 mr-2" />
                      Desbloquear
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleBlockUser} disabled={actionLoading}>
                      <Ban className="h-4 w-4 mr-2" />
                      Bloquear
                    </Button>
                  )}
                  {user2FAStatus?.hasTOTP && (
                    <Button variant="outline" size="sm" onClick={() => setReset2FADialogOpen(true)} disabled={actionLoading}>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Resetar 2FA
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={actionLoading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Cadastro</span>
              </div>
              <p className="font-medium text-sm">{formatDate(user.created_at)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Último Acesso</span>
              </div>
              <p className="font-medium text-sm">{formatDate(user.last_sign_in_at)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Saldo Disponível</span>
              </div>
              <p className="font-medium text-sm text-green-600">
                R$ {(user.available_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Mail className="h-4 w-4" />
                <span className="text-xs">Documentos</span>
              </div>
              {getVerificationBadge()}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Receita do Usuário
            </CardTitle>
            <CardDescription>Visão geral financeira</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[
                    { name: 'Faturado', value: userTotalPaid, color: '#3b82f6' },
                    { name: 'Líquido', value: userTotalLiquid, color: '#10b981' },
                    { name: 'Disponível', value: user.available_balance || 0, color: '#22c55e' },
                    { name: 'Sacado', value: userTotalWithdrawn, color: '#f59e0b' },
                    ...(userTotalPending > 0 ? [{ name: 'Pendente', value: userTotalPending, color: '#ef4444' }] : []),
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => value >= 1000 ? `R$ ${(value/1000).toFixed(0)}K` : `R$ ${value}`} 
                    className="text-xs"
                  />
                  <Tooltip 
                    cursor={false}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: 'Faturado', value: userTotalPaid, color: '#3b82f6' },
                      { name: 'Líquido', value: userTotalLiquid, color: '#10b981' },
                      { name: 'Disponível', value: user.available_balance || 0, color: '#22c55e' },
                      { name: 'Sacado', value: userTotalWithdrawn, color: '#f59e0b' },
                      ...(userTotalPending > 0 ? [{ name: 'Pendente', value: userTotalPending, color: '#ef4444' }] : []),
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={`grid grid-cols-2 ${userTotalPending > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 mt-4 pt-4 border-t`}>
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-1"></div>
                <p className="text-xs text-muted-foreground">Faturado</p>
                <p className="font-semibold text-sm">R$ {userTotalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-1"></div>
                <p className="text-xs text-muted-foreground">Líquido</p>
                <p className="font-semibold text-sm">R$ {userTotalLiquid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-1"></div>
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="font-semibold text-sm">R$ {(user.available_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-amber-500 mx-auto mb-1"></div>
                <p className="text-xs text-muted-foreground">Sacado</p>
                <p className="font-semibold text-sm">R$ {userTotalWithdrawn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              {userTotalPending > 0 && (
                <div className="text-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-1"></div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="font-semibold text-sm text-red-500">R$ {userTotalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações do Usuário</CardTitle>
            <CardDescription>Configure as opções de pagamento e taxas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Acquirer */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Adquirente</Label>
              <p className="text-xs text-muted-foreground">
                Selecione qual gateway de pagamento este usuário irá utilizar
              </p>
              <Select value={selectedAcquirer || 'default'} onValueChange={(val) => setSelectedAcquirer(val === 'default' ? '' : val)}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Usar padrão do sistema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-3 h-3 text-muted-foreground" />
                      Usar padrão do sistema ({defaultAcquirer === 'inter' ? 'Banco Inter' : defaultAcquirer === 'ativus' ? 'Ativus Hub' : 'VALORION'})
                    </div>
                  </SelectItem>
                  <SelectItem value="valorion">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3 h-3 text-primary" />
                      VALORION
                    </div>
                  </SelectItem>
                  <SelectItem value="inter">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500 font-bold">I</span>
                      Banco Inter
                    </div>
                  </SelectItem>
                  <SelectItem value="ativus">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-500 font-bold">A</span>
                      Ativus Hub
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fee Config */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Configuração de Taxa</Label>
              <p className="text-xs text-muted-foreground">
                Selecione qual taxa será aplicada às transações deste usuário
              </p>
              <Select value={selectedFeeConfig || 'default'} onValueChange={(val) => setSelectedFeeConfig(val === 'default' ? '' : val)}>
                <SelectTrigger className="max-w-md">
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

            {/* Bypass Antifraud */}
            <div className="flex items-center justify-between p-4 border rounded-lg max-w-md">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  Bypass Antifraude
                </Label>
                <p className="text-xs text-muted-foreground">
                  Libera este usuário para gerar PIX sem verificação
                </p>
              </div>
              <Switch
                checked={bypassAntifraud}
                onCheckedChange={setBypassAntifraud}
              />
            </div>

            <Button onClick={saveUserSettings} disabled={isSaving} className="mt-4">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Rewards Progress */}
        {rewards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Progresso de Recompensas
              </CardTitle>
              <CardDescription>
                Total faturado: <span className="font-semibold text-foreground">R$ {userTotalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map(reward => {
                  const progress = Math.min((userTotalPaid / reward.threshold_amount) * 100, 100);
                  const achieved = userTotalPaid >= reward.threshold_amount;
                  
                  return (
                    <div key={reward.id} className="flex items-start gap-3 p-4 rounded-xl border bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/20">
                      <div className="w-16 h-16 rounded-lg bg-white/50 dark:bg-black/20 p-1.5 shadow-sm shrink-0">
                        {reward.image_url ? (
                          <img src={reward.image_url} alt={reward.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-amber-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm truncate">{reward.name}</h4>
                          {achieved && <Badge className="bg-green-500 text-white text-[10px] shrink-0">✓</Badge>}
                        </div>
                        {!achieved && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Faltam <span className="font-medium text-amber-600 dark:text-amber-400">R$ {(reward.threshold_amount - userTotalPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </p>
                        )}
                        <div className="mt-2 space-y-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${achieved ? 'bg-green-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="font-medium">R$ {userTotalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-muted-foreground">R$ {reward.threshold_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reconcile Sales Section */}
        <ReconcileSalesSection 
          targetUserId={user.id} 
          onReconcileComplete={loadUserDetails}
        />
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente <strong>{user.email}</strong>? 
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

      {/* Admin Dialog */}
      <AlertDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promover para Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja promover <strong>{user.email}</strong> para Administrador? 
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

      {/* Reset 2FA Dialog */}
      <AlertDialog open={reset2FADialogOpen} onOpenChange={setReset2FADialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar 2FA</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar a autenticação de dois fatores de <strong>{user.email}</strong>? 
              O usuário precisará configurar o 2FA novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset2FA} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserDetail;
