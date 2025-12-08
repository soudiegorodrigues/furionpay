import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Clock, RefreshCw, ChevronLeft, ChevronRight, Calendar, QrCode, User, History } from "lucide-react";

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
const ITEMS_PER_PAGE = 10;
type DateFilter = 'today' | '7days' | 'month' | 'year' | 'all';
const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    isAuthenticated,
    loading,
    signOut,
    user
  } = useAdminAuth();
  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);
  const loadData = async (showLoading = true) => {
    if (showLoading && !stats) setIsLoading(true);
    try {
      // Load dashboard stats (user-scoped)
      const {
        data: statsData,
        error: statsError
      } = await supabase.rpc('get_user_dashboard');
      if (statsError) throw statsError;
      setStats(statsData as unknown as DashboardStats);

      // Load transactions (user-scoped)
      const {
        data: txData,
        error: txError
      } = await supabase.rpc('get_user_transactions', {
        p_limit: 50
      });
      if (txError) throw txError;
      setTransactions(txData as unknown as Transaction[] || []);

      // Load banner URL from user settings
      const { data: settingsData } = await supabase.rpc('get_user_settings');
      if (settingsData) {
        const settings = settingsData as { key: string; value: string }[];
        const banner = settings.find(s => s.key === 'dashboard_banner_url');
        setBannerUrl(banner?.value || null);
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
  const conversionRate = stats && stats.total_generated > 0 ? (stats.total_paid / stats.total_generated * 100).toFixed(1) : '0';

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
      conversionRate: generated > 0 ? (paid / generated * 100).toFixed(1) : '0'
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
  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 sm:h-7 sm:w-7 text-primary shrink-0" />
              <span className="truncate">Dashboard Financeiro</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Acompanhe as transações PIX
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData(false)}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Banner */}
      {bannerUrl && (
        <div className="rounded-lg overflow-hidden border border-border">
          <img
            src={bannerUrl}
            alt="Banner do Dashboard"
            className="w-full h-auto object-cover max-h-[200px]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground">PIX Gerados</p>
              <QrCode className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{filteredStats.generated}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{formatCurrency(filteredStats.amountGenerated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground">PIX Pagos</p>
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-green-500 mt-1">{filteredStats.paid}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{formatCurrency(filteredStats.amountPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground">Conversão</p>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{filteredStats.conversionRate}%</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Taxa geral</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground">Usuário</p>
              <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
            </div>
            <p className="text-sm sm:text-lg font-medium text-foreground mt-1 truncate">{user?.email?.split('@')[0] || 'N/A'}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Logado</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-sm sm:text-lg">Histórico de Transações</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs sm:text-sm">
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Carregando...</p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Produto</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">{tx.donor_name}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell max-w-[100px] truncate">{tx.product_name || '-'}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      </TableRow>
                    ))}
                    {paginatedTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                          Nenhuma transação encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    {filteredTransactions.length} transações
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      {currentPage}/{totalPages}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
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
  );
};
export default AdminDashboard;