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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import TransactionDetailsSheet from "@/components/TransactionDetailsSheet";

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
interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
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
  fee_percentage: number | null;
  fee_fixed: number | null;
  utm_data: UTMData | null;
  popup_model: string | null;
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

interface FeeConfig {
  pix_percentage: number;
  pix_fixed: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [chartFilter, setChartFilter] = useState<ChartFilter>('today');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, signOut } = useAdminAuth();

  // Calculate net amount after fee deduction - uses stored fee from transaction or fallback to current config
  const calculateNetAmount = (grossAmount: number, storedFeePercentage?: number | null, storedFeeFixed?: number | null): number => {
    // Use stored fees from transaction if available (for historical accuracy)
    if (storedFeePercentage !== null && storedFeePercentage !== undefined && 
        storedFeeFixed !== null && storedFeeFixed !== undefined) {
      const fee = (grossAmount * storedFeePercentage / 100) + storedFeeFixed;
      return Math.max(0, grossAmount - fee);
    }
    // Fallback to current fee config for older transactions without stored fees
    if (!feeConfig) return grossAmount;
    const fee = (grossAmount * feeConfig.pix_percentage / 100) + feeConfig.pix_fixed;
    return Math.max(0, grossAmount - fee);
  };

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
      // Load user-specific fee config or fallback to default
      const { data: userSettingsData } = await supabase.rpc('get_user_settings');
      let userFeeConfigId: string | null = null;
      
      if (userSettingsData) {
        const settings = userSettingsData as { key: string; value: string }[];
        const feeConfigSetting = settings.find(s => s.key === 'user_fee_config');
        userFeeConfigId = feeConfigSetting?.value || null;
      }
      
      // Load fee config - user specific or default
      let feeData;
      if (userFeeConfigId) {
        const { data } = await supabase
          .from('fee_configs')
          .select('pix_percentage, pix_fixed')
          .eq('id', userFeeConfigId)
          .maybeSingle();
        feeData = data;
      }
      
      // Fallback to default if no user-specific config
      if (!feeData) {
        const { data } = await supabase
          .from('fee_configs')
          .select('pix_percentage, pix_fixed')
          .eq('is_default', true)
          .maybeSingle();
        feeData = data;
      }
      
      if (feeData) {
        setFeeConfig(feeData as FeeConfig);
      }

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

  // Helper to get Brazil date string (YYYY-MM-DD) from a date
  const getBrazilDateStr = (date: Date): string => {
    return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  };
  
  // Helper to get Brazil hour from a date
  const getBrazilHour = (date: Date): number => {
    return parseInt(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }));
  };

  const chartData = useMemo((): ChartData[] => {
    const data: ChartData[] = [];
    const now = new Date();
    const todayBrazil = getBrazilDateStr(now);
    
    if (chartFilter === 'today') {
      // Hourly data for today - use paid_at for paid transactions (Brazil timezone)
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0') + ':00';
        
        // Filter transactions created today at this hour (Brazil time)
        const hourGerados = transactions.filter(tx => {
          const txDate = new Date(tx.created_at);
          return getBrazilDateStr(txDate) === todayBrazil && getBrazilHour(txDate) === hour;
        });
        
        // Filter transactions PAID today at this hour (using paid_at, Brazil time)
        const hourPagos = transactions.filter(tx => {
          if (tx.status !== 'paid' || !tx.paid_at) return false;
          const paidDate = new Date(tx.paid_at);
          return getBrazilDateStr(paidDate) === todayBrazil && getBrazilHour(paidDate) === hour;
        });
        
        const gerados = hourGerados.length;
        const pagos = hourPagos.length;
        const valorPago = hourPagos.reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
        
        data.push({ date: hourStr, gerados, pagos, valorPago });
      }
    } else {
      // Daily data for other filters - ALWAYS include today (Brazil timezone)
      const days = getChartDays(chartFilter);
      
      // Build array of dates from oldest to newest (ending with today)
      const dates: string[] = [];
      
      // First: get TODAY in São Paulo timezone as string YYYY-MM-DD
      const todayBrazilStr = getBrazilDateStr(new Date()); // Ex: "2025-12-14"
      const [todayYear, todayMonth, todayDay] = todayBrazilStr.split('-').map(Number);
      
      // Create base date using São Paulo date components (noon to avoid timezone edge cases)
      const baseDate = new Date(todayYear, todayMonth - 1, todayDay, 12, 0, 0);
      
      for (let i = days - 1; i >= 0; i--) {
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() - i);
        // Format manually to avoid timezone conversion issues
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        dates.push(dateStr);
      }
      
      // Now generate chart data for each date
      for (const dateStr of dates) {
        // Format display as DD/MM
        const [, m, d] = dateStr.split('-');
        const displayDate = `${d}/${m}`;
        
        // Transactions created on this day (Brazil time)
        const dayGerados = transactions.filter(tx => {
          return getBrazilDateStr(new Date(tx.created_at)) === dateStr;
        });
        
        // Transactions PAID on this day (using paid_at, Brazil time)
        const dayPagos = transactions.filter(tx => {
          if (tx.status !== 'paid' || !tx.paid_at) return false;
          return getBrazilDateStr(new Date(tx.paid_at)) === dateStr;
        });
        
        const gerados = dayGerados.length;
        const pagos = dayPagos.length;
        const valorPago = dayPagos.reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
        
        data.push({ date: displayDate, gerados, pagos, valorPago });
      }
    }
    
    return data;
  }, [transactions, chartFilter]);

  const filteredStats = useMemo(() => {
    const generated = filteredTransactions.length;
    const paid = filteredTransactions.filter(tx => tx.status === 'paid').length;
    // Calculate net amount (after fee deduction) for ALL transactions (estimated)
    const amountGenerated = filteredTransactions.reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
    // Calculate net amount (after fee deduction) for paid transactions
    const amountPaid = filteredTransactions
      .filter(tx => tx.status === 'paid')
      .reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
    return {
      generated,
      paid,
      amountGenerated,
      amountPaid,
      conversionRate: generated > 0 ? (paid / generated * 100).toFixed(1) : '0'
    };
  }, [filteredTransactions, feeConfig]);

  // Today's stats (using paid_at for paid stats, Brazil timezone)
  const todayStats = useMemo(() => {
    const now = new Date();
    const todayBrazil = getBrazilDateStr(now);
    
    // Transactions CREATED today (Brazil time)
    const todayCreated = transactions.filter(tx => getBrazilDateStr(new Date(tx.created_at)) === todayBrazil);
    const generated = todayCreated.length;
    
    // Transactions PAID today (using paid_at, Brazil time)
    const todayPaid = transactions.filter(tx => {
      if (tx.status !== 'paid' || !tx.paid_at) return false;
      return getBrazilDateStr(new Date(tx.paid_at)) === todayBrazil;
    });
    const paid = todayPaid.length;
    // Calculate net amount (after fee deduction) using stored fees
    const amountPaid = todayPaid.reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
    
    return { generated, paid, amountPaid };
  }, [transactions, feeConfig]);

  // Month's stats (using paid_at, Brazil timezone)
  const monthStats = useMemo(() => {
    const now = new Date();
    // Get current month/year in Brazil timezone
    const brazilNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const currentMonth = brazilNow.getMonth();
    const currentYear = brazilNow.getFullYear();
    
    // Filter transactions PAID this month (using paid_at, Brazil time)
    const monthPaid = transactions.filter(tx => {
      if (tx.status !== 'paid' || !tx.paid_at) return false;
      const paidDate = new Date(tx.paid_at);
      const paidBrazil = new Date(paidDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      return paidBrazil.getMonth() === currentMonth && paidBrazil.getFullYear() === currentYear;
    });
    
    // Calculate net amount (after fee deduction) using stored fees
    const amountPaid = monthPaid.reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
    return { amountPaid };
  }, [transactions, feeConfig]);

  // Total balance (all paid transactions) - net amount using stored fees
  const totalBalance = useMemo(() => {
    return transactions
      .filter(tx => tx.status === 'paid')
      .reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
  }, [transactions, feeConfig]);

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
            <div className="h-[350px] sm:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid 
                    stroke="hsl(var(--muted-foreground))"
                    opacity={0.15} 
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    hide
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'pagos') return [value, 'Total de vendas'];
                      return [value, name];
                    }}
                  />
                  <Bar 
                    dataKey="pagos" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="hsl(var(--primary))"
                      />
                    ))}
                    <LabelList 
                      dataKey="pagos" 
                      position="top" 
                      fill="hsl(var(--muted-foreground))"
                      fontSize={9}
                      formatter={(value: number) => {
                        const total = chartData.reduce((sum, item) => sum + item.pagos, 0);
                        if (total === 0 || value === 0) return '';
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${percentage}%`;
                      }}
                    />
                  </Bar>
                </BarChart>
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
                      <TableRow 
                        key={tx.id} 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setIsSheetOpen(true);
                        }}
                      >
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">{tx.donor_name}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell max-w-[100px] truncate">{tx.product_name || '-'}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatCurrency(calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed))}</TableCell>
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

      {/* Transaction Details Sheet */}
      <TransactionDetailsSheet
        transaction={selectedTransaction}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        calculateNetAmount={calculateNetAmount}
      />
    </div>
  );
};
export default AdminDashboard;