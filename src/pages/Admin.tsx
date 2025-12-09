import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { 
  DollarSign, 
  Globe, 
  CreditCard, 
  Users, 
  FileText, 
  Percent, 
  Palette,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Calendar,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Shield,
  ShieldOff,
  Ban,
  Unlock,
  Trophy,
  Mail,
  AlertTriangle,
  Search,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { PersonalizacaoSection } from "@/components/admin/PersonalizacaoSection";
import { EmailSection } from "@/components/admin/EmailSection";

// Zona de Perigo Component
const ZonaDePerigo = () => {
  const [isResettingGlobal, setIsResettingGlobal] = useState(false);

  const handleResetGlobalDashboard = async () => {
    setIsResettingGlobal(true);
    try {
      const { error } = await supabase.rpc('reset_pix_transactions_auth');
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Todas as transações da plataforma foram apagadas!"
      });
    } catch (error) {
      console.error('Error resetting global transactions:', error);
      toast({
        title: "Erro",
        description: "Falha ao resetar transações globais",
        variant: "destructive"
      });
    } finally {
      setIsResettingGlobal(false);
    }
  };

  return (
    <Card className="border-destructive/50 max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Zona de Perigo
        </CardTitle>
        <CardDescription>
          Ações irreversíveis que afetam permanentemente os dados da plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isResettingGlobal}>
                {isResettingGlobal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetando Global...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Resetar Faturamento Global
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ ATENÇÃO: Ação Crítica!</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá apagar TODAS as transações de TODOS os usuários da plataforma.
                  Isso inclui o histórico completo de pagamentos de todas as contas.
                  Esta ação NÃO pode ser desfeita!
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetGlobalDashboard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sim, apagar TUDO da plataforma
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-sm text-muted-foreground">
            Isso irá apagar todas as transações de todos os usuários da plataforma.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface GlobalStats {
  total_generated: number;
  total_paid: number;
  total_expired: number;
  total_amount_generated: number;
  total_amount_paid: number;
  today_generated: number;
  today_paid: number;
  today_amount_paid: number;
}

interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired';
  txid: string;
  donor_name: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
  user_email: string | null;
}

interface Domain {
  id: string;
  domain: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  full_name: string | null;
}

interface RankingUser {
  user_id: string;
  user_email: string;
  total_generated: number;
  total_paid: number;
  total_amount_generated: number;
  total_amount_paid: number;
  conversion_rate: number;
}

const USERS_PER_PAGE = 10;
const RANKING_PER_PAGE = 5;

const ITEMS_PER_PAGE = 10;
type DateFilter = 'all' | 'today' | '7days' | 'month' | 'year';
type StatusFilter = 'all' | 'generated' | 'paid' | 'expired';

const Admin = () => {
  const location = useLocation();
  const { user } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<string>(() => {
    // Check if coming from another page with section state
    const state = location.state as { section?: string } | null;
    return state?.section || "faturamento";
  });

  // Authentication redirect is handled by AdminLayout
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  // Domain states
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainName, setNewDomainName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState("");
  const [editName, setEditName] = useState("");

  // User states
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState("");

  // Ranking states
  const [rankingUsers, setRankingUsers] = useState<RankingUser[]>([]);
  const [rankingPage, setRankingPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [rankingDateFilter, setRankingDateFilter] = useState<DateFilter>('all');
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);

  useEffect(() => {
    if (activeSection === "faturamento") {
      loadGlobalStats();
      loadTransactions();
    } else if (activeSection === "dominios") {
      loadDomains();
    } else if (activeSection === "usuarios") {
      loadUsers();
    } else if (activeSection === "ranking") {
      loadRanking();
    }
  }, [activeSection]);

  const loadGlobalStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pix_dashboard_auth');
      if (error) throw error;
      setGlobalStats(data as unknown as GlobalStats);
    } catch (error) {
      console.error('Error loading global stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const { data, error } = await supabase.rpc('get_pix_transactions_auth', { p_limit: 500 });
      if (error) throw error;
      setTransactions(data as unknown as Transaction[] || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const loadDomains = async () => {
    setIsLoadingDomains(true);
    try {
      const { data, error } = await supabase
        .from('available_domains')
        .select('*')
        .order('domain');
      
      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar domínios",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDomains(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast({
        title: "Erro",
        description: "Digite um domínio válido",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('available_domains')
        .insert({
          domain: newDomain.trim().toLowerCase(),
          name: newDomainName.trim() || null
        });
      
      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este domínio já existe",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Sucesso",
          description: "Domínio adicionado com sucesso!"
        });
        setNewDomain("");
        setNewDomainName("");
        loadDomains();
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar domínio",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleDomainStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('available_domains')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      setDomains(domains.map(d => 
        d.id === id ? { ...d, is_active: !currentStatus } : d
      ));
      
      toast({
        title: "Sucesso",
        description: `Domínio ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`
      });
    } catch (error) {
      console.error('Error toggling domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar domínio",
        variant: "destructive"
      });
    }
  };

  const deleteDomain = async (id: string) => {
    try {
      const { error } = await supabase
        .from('available_domains')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setDomains(domains.filter(d => d.id !== id));
      
      toast({
        title: "Sucesso",
        description: "Domínio removido com sucesso!"
      });
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover domínio",
        variant: "destructive"
      });
    }
  };

  const startEditing = (domain: Domain) => {
    setEditingId(domain.id);
    setEditDomain(domain.domain);
    setEditName(domain.name || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDomain("");
    setEditName("");
  };

  const saveEdit = async (id: string) => {
    if (!editDomain.trim()) {
      toast({
        title: "Erro",
        description: "Digite um domínio válido",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('available_domains')
        .update({
          domain: editDomain.trim().toLowerCase(),
          name: editName.trim() || null
        })
        .eq('id', id);
      
      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este domínio já existe",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        setDomains(domains.map(d => 
          d.id === id 
            ? { ...d, domain: editDomain.trim().toLowerCase(), name: editName.trim() || null }
            : d
        ));
        cancelEditing();
        toast({
          title: "Sucesso",
          description: "Domínio atualizado com sucesso!"
        });
      }
    } catch (error) {
      console.error('Error updating domain:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar domínio",
        variant: "destructive"
      });
    }
  };

  // User functions
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_auth');
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar usuários',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleGrantAdmin = async (userId: string) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase.rpc('grant_admin_role', { target_user_id: userId });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Permissão de admin concedida' });
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

  const openDeleteDialog = (u: User) => {
    setUserToDelete(u);
    setDeleteDialogOpen(true);
  };

  // Ranking functions
  const loadRanking = async () => {
    setIsLoadingRanking(true);
    try {
      const { data: rankingData } = await supabase.rpc('get_users_revenue_ranking', {
        p_limit: RANKING_PER_PAGE,
        p_offset: (rankingPage - 1) * RANKING_PER_PAGE,
        p_date_filter: rankingDateFilter
      });
      if (rankingData) {
        setRankingUsers(rankingData as unknown as RankingUser[]);
      }
      const { data: countData } = await supabase.rpc('get_users_count');
      if (countData !== null) {
        setTotalUsers(countData as number);
      }
    } catch (error) {
      console.error('Error loading ranking:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar ranking',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRanking(false);
    }
  };

  const handleRankingFilterChange = async (value: DateFilter) => {
    setRankingDateFilter(value);
    setRankingPage(1);
    setIsLoadingRanking(true);
    try {
      const { data } = await supabase.rpc('get_users_revenue_ranking', {
        p_limit: RANKING_PER_PAGE,
        p_offset: 0,
        p_date_filter: value
      });
      if (data) setRankingUsers(data as unknown as RankingUser[]);
    } finally {
      setIsLoadingRanking(false);
    }
  };

  const handleRankingPageChange = async (newPage: number) => {
    setRankingPage(newPage);
    setIsLoadingRanking(true);
    try {
      const { data } = await supabase.rpc('get_users_revenue_ranking', {
        p_limit: RANKING_PER_PAGE,
        p_offset: (newPage - 1) * RANKING_PER_PAGE,
        p_date_filter: rankingDateFilter
      });
      if (data) setRankingUsers(data as unknown as RankingUser[]);
    } finally {
      setIsLoadingRanking(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const search = userSearch.toLowerCase().trim();
    return users.filter(u => 
      u.email.toLowerCase().includes(search) || 
      (u.full_name && u.full_name.toLowerCase().includes(search))
    );
  }, [users, userSearch]);

  const userTotalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((userCurrentPage - 1) * USERS_PER_PAGE, userCurrentPage * USERS_PER_PAGE);
  const rankingTotalPages = Math.ceil(totalUsers / RANKING_PER_PAGE);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Pago</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expirado</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Gerado</Badge>;
    }
  };

  const conversionRate = globalStats && globalStats.total_generated > 0 
    ? ((globalStats.total_paid / globalStats.total_generated) * 100).toFixed(1) 
    : '0';

  // Filter transactions by date and status
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }
    
    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        switch (dateFilter) {
          case 'today':
            return txDate >= startOfDay;
          case '7days':
            const sevenDaysAgo = new Date(startOfDay);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return txDate >= sevenDaysAgo;
          case 'month':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return txDate >= startOfMonth;
          case 'year':
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            return txDate >= startOfYear;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [transactions, dateFilter, statusFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminNavigation activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Content Sections */}
        {activeSection === "faturamento" && (
          <>
            {/* Stats Card */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Faturamento Global
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      setIsCheckingBatch(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('batch-check-pix-status');
                        if (error) throw error;
                        toast({
                          title: "Verificação concluída",
                          description: `${data?.checked || 0} verificadas, ${data?.updated || 0} atualizadas`
                        });
                        loadGlobalStats();
                        loadTransactions();
                      } catch (error) {
                        console.error('Batch check error:', error);
                        toast({
                          title: "Erro",
                          description: "Falha ao verificar transações",
                          variant: "destructive"
                        });
                      } finally {
                        setIsCheckingBatch(false);
                      }
                    }} 
                    disabled={isCheckingBatch}
                    className="flex-1 sm:flex-none"
                  >
                    {isCheckingBatch ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Verificar</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { loadGlobalStats(); loadTransactions(); }} disabled={isLoading} className="flex-1 sm:flex-none">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="ml-2 hidden sm:inline">Atualizar</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : globalStats ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                    <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="text-xl sm:text-3xl font-bold text-blue-500">
                        {globalStats.total_generated}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">PIX Gerados</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatCurrency(globalStats.total_amount_generated)}
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="text-xl sm:text-3xl font-bold text-green-500">
                        {globalStats.total_paid}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">PIX Pagos</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatCurrency(globalStats.total_amount_paid)}
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="text-xl sm:text-3xl font-bold text-yellow-500">
                        {conversionRate}%
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Conversão</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="text-xl sm:text-3xl font-bold text-red-500">
                        {globalStats.total_expired}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Expirados</p>
                    </div>

                    {/* Today Stats */}
                    <div className="col-span-2 lg:col-span-4 mt-3 sm:mt-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Hoje</h3>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="text-center p-2 sm:p-4 bg-primary/10 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-blue-500">
                            {globalStats.today_generated}
                          </div>
                          <p className="text-[10px] sm:text-sm text-muted-foreground">Gerados</p>
                        </div>
                        <div className="text-center p-2 sm:p-4 bg-primary/10 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-green-500">
                            {globalStats.today_paid}
                          </div>
                          <p className="text-[10px] sm:text-sm text-muted-foreground">Pagos</p>
                        </div>
                        <div className="text-center p-2 sm:p-4 bg-primary/10 rounded-lg">
                          <div className="text-sm sm:text-2xl font-bold text-primary truncate">
                            {formatCurrency(globalStats.today_amount_paid)}
                          </div>
                          <p className="text-[10px] sm:text-sm text-muted-foreground">Recebido</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado disponível
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Transações Globais
                  <Badge variant="secondary" className="ml-2 text-xs">{filteredTransactions.length}</Badge>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                    <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs sm:text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="generated">Gerado</SelectItem>
                      <SelectItem value="expired">Expirado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                    <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs sm:text-sm">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="7days">7 dias</SelectItem>
                      <SelectItem value="month">Este mês</SelectItem>
                      <SelectItem value="year">Este ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma transação encontrada
                  </p>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs hidden lg:table-cell">Email</TableHead>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Cliente</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Produto</TableHead>
                            <TableHead className="text-xs">Valor</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[150px] truncate">
                                {tx.user_email || '-'}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {formatDate(tx.created_at)}
                              </TableCell>
                              <TableCell className="text-xs font-medium max-w-[80px] sm:max-w-none truncate">
                                {tx.donor_name || '-'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground hidden sm:table-cell max-w-[100px] truncate">
                                {tx.product_name || '-'}
                              </TableCell>
                              <TableCell className="text-xs font-medium whitespace-nowrap">
                                {formatCurrency(tx.amount)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(tx.status)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
                        </p>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-8 px-2 sm:px-3"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Anterior</span>
                          </Button>
                          <span className="text-xs sm:text-sm text-muted-foreground px-2">
                            {currentPage}/{totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 px-2 sm:px-3"
                          >
                            <span className="hidden sm:inline mr-1">Próximo</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeSection === "ranking" && (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                Ranking de Faturamentos
              </CardTitle>
              <Select value={rankingDateFilter} onValueChange={handleRankingFilterChange}>
                <SelectTrigger className="w-[100px] h-7 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="7days">7 dias</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="year">Ano</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isLoadingRanking ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : rankingUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado
                </p>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-sm font-semibold">#</TableHead>
                          <TableHead className="text-sm font-semibold">Usuário</TableHead>
                          <TableHead className="text-center text-sm font-semibold hidden sm:table-cell">Gerados</TableHead>
                          <TableHead className="text-center text-sm font-semibold">Pagos</TableHead>
                          <TableHead className="text-center text-sm font-semibold hidden sm:table-cell">Conv.</TableHead>
                          <TableHead className="text-right text-sm font-semibold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingUsers.map((rankUser, index) => (
                          <TableRow key={rankUser.user_id || index}>
                            <TableCell className="font-bold text-sm">
                              {(rankingPage - 1) * RANKING_PER_PAGE + index + 1}º
                            </TableCell>
                            <TableCell className="truncate max-w-[120px] sm:max-w-[200px] text-sm">
                              {rankUser.user_email}
                            </TableCell>
                            <TableCell className="text-center text-blue-400 text-sm hidden sm:table-cell">
                              {rankUser.total_generated}
                            </TableCell>
                            <TableCell className="text-center text-green-400 text-sm">
                              {rankUser.total_paid}
                            </TableCell>
                            <TableCell className="text-center text-yellow-400 text-sm hidden sm:table-cell">
                              {rankUser.conversion_rate}%
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary text-sm whitespace-nowrap">
                              {formatCurrency(rankUser.total_amount_paid)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {rankingTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {rankingPage}/{rankingTotalPages}
                      </span>
                      <div className="flex gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleRankingPageChange(rankingPage - 1)}
                          disabled={rankingPage === 1 || isLoadingRanking}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleRankingPageChange(rankingPage + 1)}
                          disabled={rankingPage >= rankingTotalPages || isLoadingRanking}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "dominios" && (
          <div className="space-y-6">
            {/* Add Domain */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Adicionar Domínio
                </CardTitle>
                <CardDescription>
                  Adicione um novo domínio disponível para os usuários escolherem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domínio</Label>
                    <Input
                      id="domain"
                      placeholder="exemplo.com.br"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (opcional)</Label>
                    <Input
                      id="name"
                      placeholder="Nome amigável"
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={addDomain} disabled={isAdding}>
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar Domínio
                </Button>
              </CardContent>
            </Card>

            {/* Domains List - Two Cards */}
            {isLoadingDomains ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : domains.length === 0 ? (
              <Card className="max-w-md">
                <CardContent className="py-8">
                  <p className="text-muted-foreground text-center">
                    Nenhum domínio cadastrado
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map((cardIndex) => {
                  const startIndex = cardIndex * 5;
                  const cardDomains = domains.slice(startIndex, startIndex + 5);
                  if (cardDomains.length === 0) return null;
                  
                  return (
                    <Card key={cardIndex}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Globe className="h-4 w-4 text-primary" />
                          Domínios {cardIndex === 0 ? '1-5' : '6-10'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {cardDomains.length} domínio(s)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {cardDomains.map((domain) => (
                            <div 
                              key={domain.id} 
                              className={`p-3 rounded-lg border ${
                                domain.is_active ? 'bg-card' : 'bg-muted/50'
                              }`}
                            >
                              {editingId === domain.id ? (
                                /* Editing Mode */
                                <div className="space-y-2">
                                  <div className="space-y-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Domínio</Label>
                                      <Input
                                        value={editDomain}
                                        onChange={(e) => setEditDomain(e.target.value)}
                                        placeholder="exemplo.com.br"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Nome (opcional)</Label>
                                      <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Nome amigável"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(domain.id)}>
                                      <Check className="w-3 h-3 mr-1" />
                                      Salvar
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEditing}>
                                      <X className="w-3 h-3 mr-1" />
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* View Mode */
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      domain.is_active ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-sm truncate">{domain.domain}</p>
                                      {domain.name && (
                                        <p className="text-xs text-muted-foreground truncate">{domain.name}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => startEditing(domain)}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Switch
                                      checked={domain.is_active}
                                      onCheckedChange={() => toggleDomainStatus(domain.id, domain.is_active)}
                                      className="scale-75"
                                    />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remover domínio?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. O domínio "{domain.domain}" será removido permanentemente.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteDomain(domain.id)}>
                                            Remover
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeSection === "multi" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Adquirentes Ativas</h2>
                <Badge variant="secondary" className="text-xs">1</Badge>
              </div>
              <Button variant="outline" disabled>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Adquirente
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* SPEDPAY Card */}
              <Card className="border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-primary">SPEDPAY</CardTitle>
                  <CardDescription className="text-sm">
                    Adquirente principal integrada ao sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Métodos de pagamento disponíveis:</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                              <path d="M21.8 9.6l-4.4 4.4c-.8.8-2 .8-2.8 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.8-.8 2-.8 2.8 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                              <path d="M21.8 23.8l-4.4-4.4c-.8-.8-2-.8-2.8 0l-4.4 4.4c-.4.4-.4 1 0 1.4l4.4 4.4c.8.8 2 .8 2.8 0l4.4-4.4c.4-.4.4-1 0-1.4z" fill="#10b981"/>
                              <path d="M9.6 21.8l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-4.4 4.4c-.4.4-1 .4-1.4 0z" fill="#10b981"/>
                              <path d="M28.2 17.4l-4.4 4.4c-.4.4-1 .4-1.4 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                            </svg>
                          </div>
                          <span className="text-sm font-medium">PIX</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Ativo</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-600/10">
                      <Check className="w-3 h-3 mr-1" />
                      Integrado
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Add New Acquirer Card (Placeholder) */}
              <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-not-allowed opacity-50">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Adicionar Nova Adquirente</p>
                  <p className="text-xs text-muted-foreground mt-1">Em breve</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Dica:</strong> Novas adquirentes serão disponibilizadas em futuras atualizações. 
                  Por enquanto, todas as transações são processadas pela SpedPay.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "usuarios" && (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Gerenciar Usuários
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">{filteredUsers.length} de {users.length} usuário(s)</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoadingUsers} className="w-full sm:w-auto">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
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
                      setUserCurrentPage(1);
                    }}
                    className="pl-9 w-full sm:max-w-sm h-8 text-sm"
                  />
                </div>
              </div>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">Email</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">Cadastro</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-right text-xs">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                              Nenhum usuário cadastrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedUsers.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium text-xs max-w-[100px] truncate">
                                {u.full_name || u.email.split('@')[0]}
                              </TableCell>
                              <TableCell className="text-xs hidden sm:table-cell max-w-[150px] truncate">{u.email}</TableCell>
                              <TableCell className="text-xs hidden md:table-cell whitespace-nowrap">{formatDate(u.created_at)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {u.is_blocked ? (
                                    <Badge variant="destructive" className="text-[10px] px-1.5">Bloq.</Badge>
                                  ) : u.is_admin ? (
                                    <Badge className="bg-primary text-[10px] px-1.5">Admin</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] px-1.5">User</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {u.id === user?.id ? (
                                  <span className="text-xs text-muted-foreground">Você</span>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    {u.is_admin ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleRevokeAdmin(u.id)}
                                        disabled={actionLoading === u.id}
                                        title="Revogar Admin"
                                      >
                                        {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleGrantAdmin(u.id)}
                                        disabled={actionLoading === u.id}
                                        title="Tornar Admin"
                                      >
                                        {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                                      </Button>
                                    )}
                                    {u.is_blocked ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleUnblockUser(u.id)}
                                        disabled={actionLoading === u.id}
                                        title="Desbloquear"
                                      >
                                        {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 hidden sm:flex"
                                        onClick={() => handleBlockUser(u.id)}
                                        disabled={actionLoading === u.id}
                                        title="Bloquear"
                                      >
                                        {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => openDeleteDialog(u)}
                                      disabled={actionLoading === u.id}
                                      title="Excluir"
                                    >
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
                  {userTotalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {((userCurrentPage - 1) * USERS_PER_PAGE) + 1}-{Math.min(userCurrentPage * USERS_PER_PAGE, users.length)} de {users.length}
                      </p>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
                          disabled={userCurrentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs sm:text-sm text-muted-foreground px-2">
                          {userCurrentPage}/{userTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setUserCurrentPage(p => Math.min(userTotalPages, p + 1))}
                          disabled={userCurrentPage === userTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

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
              <AlertDialogAction 
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {activeSection === "documentos" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "taxas" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Taxas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        )}


        {activeSection === "zona-perigo" && (
          <ZonaDePerigo />
        )}

        {activeSection === "personalizacao" && (
          <PersonalizacaoSection userId={user?.id} />
        )}

        {activeSection === "email" && (
          <EmailSection />
        )}
      </div>
  );
};

export default Admin;
