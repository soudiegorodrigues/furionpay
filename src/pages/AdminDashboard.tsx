import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
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
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    isAuthenticated,
    loading,
    signOut,
    user,
    isBlocked
  } = useAdminAuth();
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
    <AdminLayout>
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
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Atualizar</span>
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
          </div>
        </div>

        {/* Stats Cards */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              Meu Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-blue-400">
                  {dateFilter === 'all' ? stats?.total_generated || 0 : filteredStats.generated}
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">PIX Gerados</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {formatCurrency(dateFilter === 'all' ? stats?.total_amount_generated || 0 : filteredStats.amountGenerated)}
                </p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-green-400">
                  {dateFilter === 'all' ? stats?.total_paid || 0 : filteredStats.paid}
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">PIX Pagos</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {formatCurrency(dateFilter === 'all' ? stats?.total_amount_paid || 0 : filteredStats.amountPaid)}
                </p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-yellow-400">
                  {dateFilter === 'all' ? conversionRate : filteredStats.conversionRate}%
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Conversão</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-500">
                  {formatCurrency(dateFilter === 'all' ? stats?.total_amount_paid || 0 : filteredStats.amountPaid)}
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Total Recebido</p>
              </div>
            </div>
          </CardContent>
        </Card>


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

        {/* Transactions Table */}
        <Card className="bg-card border-border">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Transações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {filteredTransactions.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma transação encontrada
              </div> : <>
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
                      {paginatedTransactions.map(tx => <TableRow key={tx.id}>
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
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-blue-500" />
                              {tx.donor_name || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                            {tx.paid_at ? formatDate(tx.paid_at) : '-'}
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-border gap-3">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs sm:text-sm text-muted-foreground px-2">
                        {currentPage}/{totalPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>}
              </>}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};
export default AdminDashboard;