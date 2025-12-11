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
import { BarChart3, Clock, RefreshCw, ChevronLeft, ChevronRight, Calendar, QrCode, History, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

interface ChartData {
  date: string;
  gerados: number;
  pagos: number;
  valorPago: number;
}

const ITEMS_PER_PAGE = 10;
type DateFilter = 'today' | '7days' | '15days' | 'month' | 'year' | 'all';
type ChartFilter = 'today' | '7days' | '14days' | '30days';

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [chartFilter, setChartFilter] = useState<ChartFilter>('30days');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, signOut } = useAdminAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadData = async (showLoading = true) => {
    if (showLoading && !stats) setIsLoading(true);
    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_user_dashboard');
      if (statsError) throw statsError;
      setStats(statsData as unknown as DashboardStats);

      const { data: txData, error: txError } = await supabase.rpc('get_user_transactions', { p_limit: 200 });
      if (txError) throw txError;
      setTransactions(txData as unknown as Transaction[] || []);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

  const getFilterDays = (filter: DateFilter): number => {
    switch (filter) {
      case 'today': return 1;
      case '7days': return 7;
      case '15days': return 15;
      case 'month': return 30;
      case 'year': return 365;
      default: return 30;
    }
  };

  const getChartDays = (filter: ChartFilter): number => {
    switch (filter) {
      case 'today': return 1;
      case '7days': return 7;
      case '14days': return 14;
      case '30days': return 30;
      default: return 30;
    }
  };

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
        case '15days':
          const fifteenDaysAgo = new Date(startOfDay);
          fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
          return txDate >= fifteenDaysAgo;
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

  const chartData = useMemo((): ChartData[] => {
    const data: ChartData[] = [];
    const now = new Date();
    
    if (chartFilter === 'today') {
      // Hourly data for today
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0') + ':00';
        
        const hourTransactions = transactions.filter(tx => {
          const txDate = new Date(tx.created_at);
          const today = new Date();
          return txDate.toDateString() === today.toDateString() && txDate.getHours() === hour;
        });
        
        const gerados = hourTransactions.length;
        const pagos = hourTransactions.filter(tx => tx.status === 'paid').length;
        const valorPago = hourTransactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
        
        data.push({ date: hourStr, gerados, pagos, valorPago });
      }
    } else {
      // Daily data for other filters
      const days = getChartDays(chartFilter);
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        const dayTransactions = transactions.filter(tx => {
          const txDate = new Date(tx.created_at).toISOString().split('T')[0];
          return txDate === dateStr;
        });
        
        const gerados = dayTransactions.length;
        const pagos = dayTransactions.filter(tx => tx.status === 'paid').length;
        const valorPago = dayTransactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
        
        data.push({ date: displayDate, gerados, pagos, valorPago });
      }
    }
    
    return data;
  }, [transactions, chartFilter]);

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

  // Today's stats
  const todayStats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTransactions = transactions.filter(tx => new Date(tx.created_at) >= startOfDay);
    const generated = todayTransactions.length;
    const paid = todayTransactions.filter(tx => tx.status === 'paid').length;
    const amountPaid = todayTransactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
    return { generated, paid, amountPaid };
  }, [transactions]);

  // Month's stats
  const monthStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTransactions = transactions.filter(tx => new Date(tx.created_at) >= startOfMonth);
    const amountPaid = monthTransactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
    return { amountPaid };
  }, [transactions]);

  // Total balance (all paid transactions)
  const totalBalance = useMemo(() => {
    return transactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs sm:text-sm">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">7 dias</SelectItem>
                <SelectItem value="15days">15 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => loadData(false)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Banner */}
      {bannerUrl && (
        <div className="rounded-lg overflow-hidden border border-border">
          <img
            src={bannerUrl}
            alt="Banner do Dashboard"
            className="w-full h-auto object-cover max-h-[200px]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
      </div>

      {/* Chart + Side Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart - Visão Geral Style */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base sm:text-lg font-semibold text-primary">Visão Geral</CardTitle>
              <div className="flex items-center bg-muted rounded-full p-1">
                {[
                  { value: 'today', label: 'Hoje' },
                  { value: '7days', label: '7 dias' },
                  { value: '14days', label: '14 dias' },
                  { value: '30days', label: '30 dias' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setChartFilter(option.value as ChartFilter)}
                    className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all ${
                      chartFilter === option.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGerados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    className="stroke-muted" 
                    opacity={0.3} 
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    tickLine={false}
                    axisLine={false}
                    interval={chartFilter === 'today' ? 1 : 'preserveStartEnd'}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => [
                      name === 'valorPago' ? formatCurrency(value) : value,
                      name === 'valorPago' ? 'Valor Pago' : name === 'gerados' ? 'Gerados' : 'Pagos'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valorPago" 
                    name="valorPago"
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorGerados)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Side Cards */}
        <div className="flex flex-col gap-4">
          {/* Vendas hoje + Vendas este mês */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Vendas hoje</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(todayStats.amountPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendas este mês</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(monthStats.amountPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saldo disponível */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Saldo disponível</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalBalance)}</p>
            </CardContent>
          </Card>

          {/* Progresso de Recompensas */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-primary">🏆</span>
                  <span className="text-sm font-semibold text-primary">Progresso de Recompensas</span>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  🎁 Resgatar
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Progresso atual</span>
                <span>{formatCurrency(totalBalance)} / 100K</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((totalBalance / 100000) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-sm sm:text-lg">Histórico de Transações</CardTitle>
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