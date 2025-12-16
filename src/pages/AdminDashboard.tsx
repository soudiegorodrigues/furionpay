import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Clock, RefreshCw, ChevronLeft, ChevronRight, Calendar, QrCode, History, TrendingUp, Trophy, Gift, Wallet, Eye, EyeOff } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
type StatusFilter = 'all' | 'paid' | 'generated';
interface FeeConfig {
  pix_percentage: number;
  pix_fixed: number;
}
interface Reward {
  id: string;
  name: string;
  threshold_amount: number;
  image_url: string | null;
}
const AdminDashboard = () => {
  const isMobile = useIsMobile();
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false);
  useEffect(() => {
    const checkSize = () => setIsTabletOrSmaller(window.innerWidth < 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  // Initialize with default values for instant rendering (no null states)
  const [stats, setStats] = useState<DashboardStats>({
    total_generated: 0,
    total_paid: 0,
    total_expired: 0,
    total_amount_generated: 0,
    total_amount_paid: 0,
    today_generated: 0,
    today_paid: 0,
    today_amount_paid: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [transactionOffset, setTransactionOffset] = useState(0);
  const TRANSACTIONS_PER_LOAD = 100;
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [chartFilter, setChartFilter] = useState<ChartFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hideData, setHideData] = useState(() => {
    return localStorage.getItem('dashboard_hide_data') === 'true';
  });

  // Persist hide data preference
  useEffect(() => {
    localStorage.setItem('dashboard_hide_data', String(hideData));
  }, [hideData]);

  // Helper to mask monetary values
  const maskValue = (value: string | number, isMonetary = true): string => {
    if (!hideData) {
      return typeof value === 'number' && isMonetary ? formatCurrency(value) : String(value);
    }
    return isMonetary ? "R$ •••••" : "•••";
  };
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(true);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    isAuthenticated,
    signOut
  } = useAdminAuth();

  // Calculate net amount after fee deduction - uses stored fee from transaction or fallback to current config
  const calculateNetAmount = (grossAmount: number, storedFeePercentage?: number | null, storedFeeFixed?: number | null): number => {
    // Use stored fees from transaction if available (for historical accuracy)
    if (storedFeePercentage !== null && storedFeePercentage !== undefined && storedFeeFixed !== null && storedFeeFixed !== undefined) {
      const fee = grossAmount * storedFeePercentage / 100 + storedFeeFixed;
      return Math.max(0, grossAmount - fee);
    }
    // Fallback to current fee config for older transactions without stored fees
    if (!feeConfig) return grossAmount;
    const fee = grossAmount * feeConfig.pix_percentage / 100 + feeConfig.pix_fixed;
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
  const loadData = async (showLoading = true, resetTransactions = true) => {
    try {
      // PHASE 1: Load small/fast data FIRST (non-blocking for UI)
      const [userSettingsResult, statsResult, rewardsResult, defaultFeeResult, availableBalanceResult] = await Promise.all([
        supabase.rpc('get_user_settings'), 
        supabase.rpc('get_user_dashboard'),
        supabase.from('rewards').select('id, name, threshold_amount, image_url').eq('is_active', true).order('threshold_amount', { ascending: true }), 
        supabase.from('fee_configs').select('pix_percentage, pix_fixed').eq('is_default', true).maybeSingle(), 
        supabase.rpc('get_user_available_balance')
      ]);

      // Set available balance immediately
      if (!availableBalanceResult.error && availableBalanceResult.data !== null) {
        setAvailableBalance(availableBalanceResult.data);
      }

      // Set stats immediately
      if (!statsResult.error && statsResult.data) {
        setStats(statsResult.data as unknown as DashboardStats);
      }

      // Set rewards immediately and mark loading complete
      setRewards(rewardsResult.data || []);
      setIsLoadingRewards(false);

      // Process settings and fee config
      let feeData = defaultFeeResult.data;
      if (userSettingsResult.data) {
        const settings = userSettingsResult.data as { key: string; value: string; }[];
        const feeConfigSetting = settings.find(s => s.key === 'user_fee_config');
        const userFeeConfigId = feeConfigSetting?.value || null;

        // Get banner URL
        const banner = settings.find(s => s.key === 'dashboard_banner_url');
        setBannerUrl(banner?.value || null);

        // Load user-specific fee config if exists
        if (userFeeConfigId) {
          supabase.from('fee_configs').select('pix_percentage, pix_fixed').eq('id', userFeeConfigId).maybeSingle().then(({ data }) => {
            if (data) setFeeConfig(data as FeeConfig);
          });
        }
      }
      if (feeData) {
        setFeeConfig(feeData as FeeConfig);
      }

      // PHASE 2: Load transactions in BACKGROUND (doesn't block UI)
      if (resetTransactions) {
        setIsLoadingTransactions(true);
      }
      supabase.rpc('get_user_transactions', { p_limit: 0 }).then(({ data, error }) => {
        if (!error && data) {
          const newTx = data as unknown as Transaction[] || [];
          if (resetTransactions) {
            setTransactions(newTx);
            setTransactionOffset(TRANSACTIONS_PER_LOAD);
            setHasMoreTransactions(false);
          }
        }
        setIsLoadingTransactions(false);
      });
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
  const loadMoreTransactions = async () => {
    if (isLoadingMore || !hasMoreTransactions) return;
    setIsLoadingMore(true);
    try {
      // We need to fetch all and slice since RPC doesn't support offset
      const {
        data,
        error
      } = await supabase.rpc('get_user_transactions', {
        p_limit: transactionOffset + TRANSACTIONS_PER_LOAD
      });
      if (error) throw error;
      const allTx = data as unknown as Transaction[] || [];
      setTransactions(allTx);
      setTransactionOffset(transactionOffset + TRANSACTIONS_PER_LOAD);
      setHasMoreTransactions(allTx.length === transactionOffset + TRANSACTIONS_PER_LOAD);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mais transações",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMore(false);
    }
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
        return <Badge className="bg-red-500/80 text-white border-red-500/50">Gerado</Badge>;
    }
  };

  // Facebook icon with blue circle background
  const FacebookIcon = () => <svg viewBox="0 0 48 48" className="h-5 w-5 mx-auto">
      <circle cx="24" cy="24" r="24" fill="#1877F2" />
      <path d="M32.5 24.5H27V33H22V24.5H18V20H22V17C22 13.7 24.2 11 28 11H32V15.5H29C27.6 15.5 27 16.3 27 17.5V20H32L32.5 24.5Z" fill="white" />
    </svg>;

  // Google icon with official colors
  const GoogleIcon = () => <svg viewBox="0 0 48 48" className="h-5 w-5 mx-auto">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>;
  const getFilterDays = (filter: DateFilter): number => {
    switch (filter) {
      case 'today':
        return 1;
      case '7days':
        return 7;
      case '15days':
        return 15;
      case 'month':
        return 30;
      case 'year':
        return 365;
      default:
        return 30;
    }
  };
  const getChartDays = (filter: ChartFilter): number => {
    switch (filter) {
      case 'today':
        return 1;
      case '7days':
        return 7;
      case '14days':
        return 14;
      case '30days':
        return 30;
      default:
        return 30;
    }
  };
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

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
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }
    return filtered;
  }, [transactions, dateFilter, statusFilter]);

  // Helper to get Brazil date string (YYYY-MM-DD) from a date
  const getBrazilDateStr = (date: Date): string => {
    return date.toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo'
    });
  };

  // Helper to get Brazil hour from a date
  const getBrazilHour = (date: Date): number => {
    return parseInt(date.toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      hour12: false
    }));
  };
  const chartData = useMemo((): ChartData[] => {
    const data: ChartData[] = [];
    const now = new Date();
    const todayBrazil = getBrazilDateStr(now);
    const days = getChartDays(chartFilter);

    // STEP 1: Pre-process transactions into indexed Maps (O(n) - single pass)
    const geradosByKey = new Map<string, number>();
    const pagosByKey = new Map<string, number>();
    const valorByKey = new Map<string, number>();

    // Calculate date range for filtering (avoid processing old transactions)
    const [todayYear, todayMonth, todayDay] = todayBrazil.split('-').map(Number);
    const startDate = new Date(todayYear, todayMonth - 1, todayDay - days + 1);
    const startDateStr = getBrazilDateStr(startDate);

    for (const tx of transactions) {
      const txDate = new Date(tx.created_at);
      const txDateStr = getBrazilDateStr(txDate);
      
      // Skip transactions outside our date range
      if (txDateStr < startDateStr) continue;

      // Index generated transactions
      if (chartFilter === 'today') {
        if (txDateStr === todayBrazil) {
          const hourKey = getBrazilHour(txDate).toString();
          geradosByKey.set(hourKey, (geradosByKey.get(hourKey) || 0) + 1);
        }
      } else {
        geradosByKey.set(txDateStr, (geradosByKey.get(txDateStr) || 0) + 1);
      }

      // Index paid transactions (by paid_at date)
      if (tx.status === 'paid' && tx.paid_at) {
        const paidDate = new Date(tx.paid_at);
        const paidDateStr = getBrazilDateStr(paidDate);
        
        if (paidDateStr < startDateStr) continue;
        
        const netAmount = calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed);
        
        if (chartFilter === 'today') {
          if (paidDateStr === todayBrazil) {
            const hourKey = getBrazilHour(paidDate).toString();
            pagosByKey.set(hourKey, (pagosByKey.get(hourKey) || 0) + 1);
            valorByKey.set(hourKey, (valorByKey.get(hourKey) || 0) + netAmount);
          }
        } else {
          pagosByKey.set(paidDateStr, (pagosByKey.get(paidDateStr) || 0) + 1);
          valorByKey.set(paidDateStr, (valorByKey.get(paidDateStr) || 0) + netAmount);
        }
      }
    }

    // STEP 2: Generate chart data from indexed Maps (O(points) - constant per point)
    if (chartFilter === 'today') {
      for (let hour = 0; hour <= 23; hour++) {
        const hourKey = hour.toString();
        data.push({
          date: hour.toString().padStart(2, '0') + ':00',
          gerados: geradosByKey.get(hourKey) || 0,
          pagos: pagosByKey.get(hourKey) || 0,
          valorPago: valorByKey.get(hourKey) || 0
        });
      }
    } else {
      // Generate dates from oldest to newest
      for (let i = days - 1; i >= 0; i--) {
        const tempDate = new Date(todayYear, todayMonth - 1, todayDay - i, 12, 0, 0);
        const dateStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
        const [, m, d] = dateStr.split('-');
        
        data.push({
          date: `${d}/${m}`,
          gerados: geradosByKey.get(dateStr) || 0,
          pagos: pagosByKey.get(dateStr) || 0,
          valorPago: valorByKey.get(dateStr) || 0
        });
      }
    }

    return data;
  }, [transactions, chartFilter, feeConfig]);
  const filteredStats = useMemo(() => {
    const generated = filteredTransactions.length;
    const paid = filteredTransactions.filter(tx => tx.status === 'paid').length;
    // Calculate net amount (after fee deduction) for ALL transactions (estimated)
    const amountGenerated = filteredTransactions.reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
    // Calculate net amount (after fee deduction) for paid transactions
    const amountPaid = filteredTransactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
    const ticketMedio = paid > 0 ? amountPaid / paid : 0;
    return {
      generated,
      paid,
      amountGenerated,
      amountPaid,
      conversionRate: generated > 0 ? (paid / generated * 100).toFixed(1) : '0',
      ticketMedio
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
    return {
      generated,
      paid,
      amountPaid
    };
  }, [transactions, feeConfig]);

  // Month's stats (using paid_at, Brazil timezone)
  const monthStats = useMemo(() => {
    const now = new Date();
    // Get current month/year in Brazil timezone
    const brazilNow = new Date(now.toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo'
    }));
    const currentMonth = brazilNow.getMonth();
    const currentYear = brazilNow.getFullYear();

    // Filter transactions PAID this month (using paid_at, Brazil time)
    const monthPaid = transactions.filter(tx => {
      if (tx.status !== 'paid' || !tx.paid_at) return false;
      const paidDate = new Date(tx.paid_at);
      const paidBrazil = new Date(paidDate.toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo'
      }));
      return paidBrazil.getMonth() === currentMonth && paidBrazil.getFullYear() === currentYear;
    });

    // Calculate net amount (after fee deduction) using stored fees
    const amountPaid = monthPaid.reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
    return {
      amountPaid
    };
  }, [transactions, feeConfig]);

  // Total balance (all paid transactions) - net amount using stored fees
  const totalBalance = useMemo(() => {
    return transactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
  }, [transactions, feeConfig]);
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);
  return <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 sm:h-7 sm:w-7 text-primary shrink-0" />
              <span>Dashboard Financeiro</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Acompanhe as transações    
            </p>
          </div>
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <Select value={dateFilter} onValueChange={v => setDateFilter(v as DateFilter)}>
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setHideData(!hideData)}
              title={hideData ? "Mostrar dados" : "Ocultar dados"}
            >
              {hideData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadData(false)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Banner */}
      {bannerUrl && <div className="rounded-lg overflow-hidden border border-border">
          <img src={bannerUrl} alt="Banner do Dashboard" className="w-full h-auto object-cover max-h-[200px]" onError={e => {
        (e.target as HTMLImageElement).style.display = 'none';
      }} />
        </div>}

      {/* Stats Grid - Unified */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
        {/* Row 1: PIX Gerados | PIX Pagos */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">PIX Gerados</p>
              <QrCode className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{hideData ? "•••" : filteredStats.generated}</p>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-0.5">{maskValue(filteredStats.amountGenerated)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">PIX Pagos</p>
              <BarChart3 className="h-3 w-3 md:h-3.5 md:w-3.5 text-green-500" />
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{hideData ? "•••" : filteredStats.paid}</p>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-0.5">{maskValue(filteredStats.amountPaid)}</p>
          </CardContent>
        </Card>
        {/* Row 2: Conversão + Ticket Médio | Vendas Este Mês */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex gap-3">
              {/* Conversão */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Conversão</p>
                  <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-yellow-500" />
                </div>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{hideData ? "•••%" : `${filteredStats.conversionRate}%`}</p>
              </div>
              
              {/* Divisor */}
              <div className="w-px bg-border/50" />
              
              {/* Ticket Médio */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                    <span className="sm:hidden">Ticket M.</span>
                    <span className="hidden sm:inline">Ticket Médio</span>
                  </p>
                  <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-purple-500" />
                </div>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{maskValue(filteredStats.ticketMedio)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Vendas Este Mês</p>
              <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 text-blue-500" />
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{maskValue(monthStats.amountPaid)}</p>
          </CardContent>
        </Card>
        {/* Row 3: Vendas Hoje | Saldo Disponível */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Vendas Hoje</p>
              <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-green-500" />
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{maskValue(todayStats.amountPaid)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Saldo Disponível</p>
              <Wallet className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{maskValue(availableBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Side Cards Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Chart - Visão Geral Style */}
        <Card className="xl:col-span-2 h-full flex flex-col">
          <div className="h-px bg-border" />
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-3">
              <CardTitle className="text-base sm:text-lg font-semibold text-primary">Visão Geral</CardTitle>
              <div className="flex items-center bg-background border border-border rounded-full p-1.5 gap-1 mt-1 sm:mt-0">
                {[{
                value: 'today',
                label: 'Hoje'
              }, {
                value: '7days',
                label: '7 dias'
              }, {
                value: '14days',
                label: '14 dias'
              }, {
                value: '30days',
                label: '30 dias'
              }].map(option => <button key={option.value} onClick={() => setChartFilter(option.value as ChartFilter)} className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-all ${chartFilter === option.value ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    {option.label}
                  </button>)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 min-h-[280px] sm:min-h-[320px] w-full">
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/50 animate-pulse" />
                    <span className="text-sm text-muted-foreground">Carregando gráfico...</span>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={chartData} 
                    margin={{
                      top: 20,
                      right: 10,
                      left: 10,
                      bottom: isTabletOrSmaller ? 40 : 5
                    }}
                  >
                    <defs>
                      <linearGradient id="areaGradientPaid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.5}
                    />
                    
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                      angle={isTabletOrSmaller ? -90 : 0} 
                      textAnchor={isTabletOrSmaller ? "end" : "middle"} 
                      tickLine={false} 
                      axisLine={false} 
                      interval={0}
                      ticks={chartFilter === 'today' ? ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'] : undefined}
                      height={isTabletOrSmaller ? 50 : 30} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false}
                      width={30}
                      domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.18)]} 
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                      }} 
                      labelStyle={{
                        color: 'hsl(var(--foreground))',
                        fontWeight: 600,
                        marginBottom: '6px'
                      }} 
                      formatter={(value: number, name: string) => {
                        if (name === 'pagos') return [value, '🔴 Pagos'];
                        return [value, name];
                      }} 
                    />
                    <Area 
                      type="monotone"
                      dataKey="pagos" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#areaGradientPaid)"
                      animationDuration={800}
                      animationEasing="ease-out"
                      dot={false}
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                <span className="text-xs text-muted-foreground font-medium">Pagos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side Cards */}
        <div className="flex flex-col gap-4">
          {/* Progresso de Recompensas */}
          <Card className="bg-gradient-to-br from-primary/15 via-red-500/10 to-primary/5 border-2 border-primary/30 shadow-xl">
            <CardContent className="p-5">
              {isLoadingRewards ? (
                <div className="space-y-4 animate-pulse">
                  <div className="flex justify-center">
                    <div className="w-64 h-64 bg-muted/50 rounded-xl" />
                  </div>
                  <div className="text-center space-y-2">
                    <div className="h-4 bg-muted/50 rounded w-32 mx-auto" />
                    <div className="h-3 bg-muted/50 rounded w-24 mx-auto" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-2.5 bg-muted/50 rounded-full" />
                  </div>
                </div>
              ) : rewards.length > 0 ? <div className="space-y-4">
                  {rewards.map(reward => {
                const progress = Math.min(totalBalance / reward.threshold_amount * 100, 100);
                const achieved = totalBalance >= reward.threshold_amount;
                return <div key={reward.id} className="space-y-4">
                        {/* Imagem da placa */}
                        <div className="flex justify-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-red-400 rounded-xl blur-2xl opacity-30" />
                            {reward.image_url ? <img src={reward.image_url} alt={reward.name} className="relative w-64 h-64 object-contain drop-shadow-xl" /> : <div className="relative w-64 h-64 flex items-center justify-center">
                                <Trophy className="h-24 w-24 text-primary drop-shadow-xl" />
                              </div>}
                          </div>
                        </div>
                        
                        {/* Nome e status */}
                        <div className="text-center">
                          <h3 className="text-base font-bold">{reward.name}</h3>
                          {achieved ? <Badge className="bg-green-500 text-white mt-1 px-3 py-0.5 text-xs">
                              🎉 Conquistado!
                            </Badge> : <p className="text-xs text-muted-foreground mt-0.5">
                              Faltam <span className="font-bold text-sm text-primary">{maskValue(reward.threshold_amount - totalBalance)}</span>
                            </p>}
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Progresso</span>
                            <span className="text-primary font-bold">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-500 ${achieved ? 'bg-green-500' : 'bg-gradient-to-r from-primary via-red-400 to-red-500'} shadow-lg`} style={{
                        width: `${progress}%`
                      }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{maskValue(totalBalance)}</span>
                            <span>Meta: {maskValue(reward.threshold_amount)}</span>
                          </div>
                        </div>
                      </div>;
              })}
                  
                  {/* Botão Resgatar */}
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2 text-xs shadow-lg">
                    <Gift className="h-3.5 w-3.5 mr-1.5" />
                    Resgatar Recompensa
                  </Button>
                </div> : <div className="text-center py-4">
                  <div className="p-2 bg-primary/10 rounded-full w-fit mx-auto mb-2">
                    <Trophy className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">Nenhuma recompensa disponível</p>
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-sm sm:text-lg">Histórico de Transações</CardTitle>
            </div>
            <Select value={statusFilter} onValueChange={v => {
            setStatusFilter(v as StatusFilter);
            setCurrentPage(1);
          }}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="generated">Gerado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-center py-8 text-sm">Carregando...</p> : <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Produto</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Posicionamento</TableHead>
                      <TableHead className="text-xs text-center">UTM Tracking</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map(tx => <TableRow key={tx.id} className="cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => {
                  setSelectedTransaction(tx);
                  setIsSheetOpen(true);
                }}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">{hideData ? "•••••" : tx.donor_name}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell max-w-[100px] truncate">{tx.product_name || '-'}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{maskValue(calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed))}</TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell className="text-xs hidden md:table-cell max-w-[100px] truncate">{tx.utm_data?.utm_term || '-'}</TableCell>
                        <TableCell className="text-center">
                          {tx.utm_data?.utm_source?.toLowerCase().includes('facebook') || tx.utm_data?.utm_source?.toLowerCase().includes('fb') || tx.utm_data?.utm_source?.toLowerCase().includes('meta') ? <FacebookIcon /> : tx.utm_data?.utm_source?.toLowerCase().includes('google') || tx.utm_data?.utm_source?.toLowerCase().includes('gads') || tx.utm_data?.utm_source?.toLowerCase().includes('adwords') ? <GoogleIcon /> : null}
                        </TableCell>
                      </TableRow>)}
                    {paginatedTransactions.length === 0 && <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                          Nenhuma transação encontrada
                        </TableCell>
                      </TableRow>}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {filteredTransactions.length} transações carregadas
                  </span>
                  {totalPages > 1 && <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">
                        {currentPage}/{totalPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>}
                </div>
                {hasMoreTransactions && <Button variant="outline" className="w-full" onClick={loadMoreTransactions} disabled={isLoadingMore}>
                    {isLoadingMore ? 'Carregando...' : 'Carregar mais transações'}
                  </Button>}
              </div>
            </>}
        </CardContent>
      </Card>

      {/* Transaction Details Sheet */}
      <TransactionDetailsSheet transaction={selectedTransaction} open={isSheetOpen} onOpenChange={setIsSheetOpen} calculateNetAmount={calculateNetAmount} />
    </div>;
};
export default AdminDashboard;