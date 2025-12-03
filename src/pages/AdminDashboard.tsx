import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  QrCode, 
  CheckCircle, 
  Clock,
  Settings,
  RefreshCw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  LogOut,
  Trophy
} from "lucide-react";

interface DashboardStats {
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

const ITEMS_PER_PAGE = 10;
const RANKING_PER_PAGE = 5;

type DateFilter = 'today' | '7days' | 'month' | 'year' | 'all';

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [globalStats, setGlobalStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [rankingUsers, setRankingUsers] = useState<RankingUser[]>([]);
  const [rankingPage, setRankingPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [rankingDateFilter, setRankingDateFilter] = useState<DateFilter>('all');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, loading, signOut, user, isBlocked } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loading, navigate]);

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      loadData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load dashboard stats (user-scoped)
      const { data: statsData, error: statsError } = await supabase.rpc('get_user_dashboard');

      if (statsError) throw statsError;
      setStats(statsData as unknown as DashboardStats);

      // Load transactions (user-scoped)
      const { data: txData, error: txError } = await supabase.rpc('get_user_transactions', {
        p_limit: 50
      });

      if (txError) throw txError;
      setTransactions((txData as unknown as Transaction[]) || []);

      // Check if user is admin and load global stats
      const { data: adminCheck } = await supabase.rpc('is_admin_authenticated');
      setIsAdmin(!!adminCheck);
      
      if (adminCheck) {
        const { data: globalData } = await supabase.rpc('get_pix_dashboard_auth');
        if (globalData) {
          setGlobalStats(globalData as unknown as DashboardStats);
        }
        
        // Load ranking data
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
      }

    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      if (error.message?.includes('Not authenticated')) {
        await signOut();
        navigate('/admin');
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do dashboard",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
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

  const conversionRate = stats && stats.total_generated > 0 
    ? ((stats.total_paid / stats.total_generated) * 100).toFixed(1) 
    : '0';

  // Filter transactions by date
  const filteredTransactions = useMemo(() => {
    if (dateFilter === 'all') return transactions;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return transactions.filter(tx => {
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
  }, [transactions, dateFilter]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const generated = filteredTransactions.length;
    const paid = filteredTransactions.filter(tx => tx.status === 'paid').length;
    const amountGenerated = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const amountPaid = filteredTransactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      generated,
      paid,
      amountGenerated,
      amountPaid,
      conversionRate: generated > 0 ? ((paid / generated) * 100).toFixed(1) : '0'
    };
  }, [filteredTransactions]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <BlockedUserAlert isBlocked={isBlocked} />
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                className="shrink-0"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 sm:h-7 sm:w-7 text-primary shrink-0" />
                  <span className="truncate">Dashboard Financeiro</span>
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {user?.email && <span className="hidden sm:inline">{user.email} • </span>}
                  Acompanhe as transações PIX
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
              <SelectTrigger className="w-[120px] sm:w-[140px] text-sm">
                <Calendar className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')}>
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Configurações</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Gerado
              </CardTitle>
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {dateFilter === 'all' ? stats?.total_generated || 0 : filteredStats.generated}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {formatCurrency(dateFilter === 'all' ? stats?.total_amount_generated || 0 : filteredStats.amountGenerated)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Pago
              </CardTitle>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-400">
                {dateFilter === 'all' ? stats?.total_paid || 0 : filteredStats.paid}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {formatCurrency(dateFilter === 'all' ? stats?.total_amount_paid || 0 : filteredStats.amountPaid)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Conversão
              </CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {dateFilter === 'all' ? conversionRate : filteredStats.conversionRate}%
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Gerado → Pago
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Hoje
              </CardTitle>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stats?.today_paid || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {formatCurrency(stats?.today_amount_paid || 0)} recebido
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Global Stats Card - Admin Only */}
        {isAdmin && globalStats && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Faturamento Global da Plataforma
                <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                  <div className="text-xl sm:text-3xl font-bold text-blue-400">
                    {globalStats.total_generated}
                  </div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">PIX Gerados</p>
                </div>
                <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                  <div className="text-xl sm:text-3xl font-bold text-green-400">
                    {globalStats.total_paid}
                  </div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">PIX Pagos</p>
                </div>
                <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                  <div className="text-xl sm:text-3xl font-bold text-yellow-400">
                    {globalStats.total_generated > 0 
                      ? ((globalStats.total_paid / globalStats.total_generated) * 100).toFixed(1)
                      : '0'}%
                  </div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Conversão</p>
                </div>
                <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-muted-foreground">
                    {formatCurrency(globalStats.total_amount_generated)}
                  </div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Total Gerado</p>
                </div>
                <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-primary">
                    {formatCurrency(globalStats.total_amount_paid)}
                  </div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Total Recebido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Period Summary */}
        <Card className="bg-card border-border">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {dateFilter === 'all' ? 'Resumo de Hoje' : `Resumo do Período`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center p-2 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-blue-400">
                  {dateFilter === 'all' ? stats?.today_generated || 0 : filteredStats.generated}
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">PIX Gerados</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-green-400">
                  {dateFilter === 'all' ? stats?.today_paid || 0 : filteredStats.paid}
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">PIX Pagos</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-lg sm:text-3xl font-bold text-yellow-400">
                  {formatCurrency(dateFilter === 'all' ? stats?.today_amount_paid || 0 : filteredStats.amountPaid)}
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Total Recebido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking Card - Admin Only */}
        {isAdmin && (
          <Card className="bg-card border-border">
            <CardHeader className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  Ranking de Faturamentos
                  <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
                </CardTitle>
                <Select 
                  value={rankingDateFilter} 
                  onValueChange={async (value: DateFilter) => {
                    setRankingDateFilter(value);
                    setRankingPage(1);
                    const { data } = await supabase.rpc('get_users_revenue_ranking', {
                      p_limit: RANKING_PER_PAGE,
                      p_offset: 0,
                      p_date_filter: value
                    });
                    if (data) setRankingUsers(data as unknown as RankingUser[]);
                  }}
                >
                  <SelectTrigger className="w-[130px] sm:w-[150px] text-sm">
                    <Calendar className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="month">Este mês</SelectItem>
                    <SelectItem value="year">Este ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              {rankingUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum usuário encontrado
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm w-12">#</TableHead>
                          <TableHead className="text-xs sm:text-sm">Usuário</TableHead>
                          <TableHead className="text-xs sm:text-sm text-center">PIX Gerados</TableHead>
                          <TableHead className="text-xs sm:text-sm text-center">PIX Pagos</TableHead>
                          <TableHead className="text-xs sm:text-sm text-center">Conversão</TableHead>
                          <TableHead className="text-xs sm:text-sm text-right">Total Recebido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingUsers.map((user, index) => (
                          <TableRow key={user.user_id}>
                            <TableCell className="text-xs sm:text-sm font-bold">
                              {(rankingPage - 1) * RANKING_PER_PAGE + index + 1}º
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm truncate max-w-[150px]">
                              {user.user_email}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm text-center text-blue-400">
                              {user.total_generated}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm text-center text-green-400">
                              {user.total_paid}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm text-center text-yellow-400">
                              {user.conversion_rate}%
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm text-right font-semibold text-primary">
                              {formatCurrency(user.total_amount_paid)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Ranking Pagination */}
                  {totalUsers > RANKING_PER_PAGE && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Página {rankingPage} de {Math.ceil(totalUsers / RANKING_PER_PAGE)}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                        onClick={async () => {
                            const newPage = rankingPage - 1;
                            setRankingPage(newPage);
                            const { data } = await supabase.rpc('get_users_revenue_ranking', {
                              p_limit: RANKING_PER_PAGE,
                              p_offset: (newPage - 1) * RANKING_PER_PAGE,
                              p_date_filter: rankingDateFilter
                            });
                            if (data) setRankingUsers(data as unknown as RankingUser[]);
                          }}
                          disabled={rankingPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        onClick={async () => {
                            const newPage = rankingPage + 1;
                            setRankingPage(newPage);
                            const { data } = await supabase.rpc('get_users_revenue_ranking', {
                              p_limit: RANKING_PER_PAGE,
                              p_offset: (newPage - 1) * RANKING_PER_PAGE,
                              p_date_filter: rankingDateFilter
                            });
                            if (data) setRankingUsers(data as unknown as RankingUser[]);
                          }}
                          disabled={rankingPage >= Math.ceil(totalUsers / RANKING_PER_PAGE)}
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

        {/* Transactions Table */}
        <Card className="bg-card border-border">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma transação encontrada
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Data</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Valor</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">Produto</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">Clientes</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell">Pago em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                            {formatDate(tx.created_at)}
                          </TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <QrCode className="h-3.5 w-3.5 text-emerald-500" />
                              {formatCurrency(tx.amount)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(tx.status)}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">
                            {tx.product_name || '-'}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground hidden md:table-cell">
                            {tx.donor_name || '-'}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                            {tx.paid_at ? formatDate(tx.paid_at) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-border gap-3">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs sm:text-sm text-muted-foreground px-2">
                        {currentPage}/{totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
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
      </div>
    </div>
  );
};

export default AdminDashboard;
