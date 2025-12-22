import { useState, useEffect, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate, Link } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfetti } from "@/hooks/useConfetti";
import { AccessDenied } from "@/components/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Clock, RefreshCw, Calendar, QrCode, TrendingUp, Trophy, Gift, Wallet, Eye, EyeOff, ShoppingCart, ArrowRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
interface DashboardStats {
  total_generated: number;
  total_paid: number;
  total_expired: number;
  total_amount_generated: number;
  total_amount_paid: number;
  today_generated: number;
  today_paid: number;
  today_amount_paid: number;
  month_paid: number;
  month_amount_paid: number;
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
  acquirer?: string;
}
interface ChartData {
  date: string;
  gerados: number;
  pagos: number;
  valorPago: number;
}
type DateFilter = 'today' | 'yesterday' | '7days' | '15days' | 'month' | 'year' | 'all';
type ChartFilter = 'today' | '7days' | '14days' | '30days';
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
// Stats from period RPC (accurate counts without row limit)
interface PeriodStats {
  total_generated: number;
  total_paid: number;
  total_expired: number;
  total_amount_generated: number;
  total_amount_paid: number;
  total_fees: number;
}

const AdminDashboard = () => {
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
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
    today_amount_paid: 0,
    month_paid: 0,
    month_amount_paid: 0
  });
  const [periodStats, setPeriodStats] = useState<PeriodStats>({
    total_generated: 0,
    total_paid: 0,
    total_expired: 0,
    total_amount_generated: 0,
    total_amount_paid: 0,
    total_fees: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPeriodStats, setIsLoadingPeriodStats] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [chartFilter, setChartFilter] = useState<ChartFilter>('today');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isBannerLoading, setIsBannerLoading] = useState(true);
  const [isBannerImageLoaded, setIsBannerImageLoaded] = useState(false);
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
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();
  const { triggerConfettiInElement } = useConfetti();
  const previousAchievedRef = useRef<string | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    toast
  } = useToast();
  const {
    isAuthenticated,
    user,
    signOut
  } = useAdminAuth();

  // Calcular próxima meta fora do JSX para poder usar em useEffect
  const rewardData = useMemo(() => {
    if (rewards.length === 0) return null;
    
    const sortedRewards = [...rewards].sort((a, b) => a.threshold_amount - b.threshold_amount);
    const nextReward = sortedRewards.find(r => stats.total_amount_paid < r.threshold_amount) 
      || sortedRewards[sortedRewards.length - 1];
    
    const progress = Math.min(stats.total_amount_paid / nextReward.threshold_amount * 100, 100);
    const achieved = stats.total_amount_paid >= nextReward.threshold_amount;
    
    return { nextReward, progress, achieved };
  }, [rewards, stats.total_amount_paid]);

  // Disparar confete quando meta for conquistada
  useEffect(() => {
    if (!rewardData || !rewardData.achieved) return;
    
    const rewardId = rewardData.nextReward.id;
    const celebratedKey = `celebrated_reward_${rewardId}`;
    const wasCelebrated = localStorage.getItem(celebratedKey);
    
    // Só dispara se ainda não foi celebrado e não é a mesma meta
    if (!wasCelebrated && previousAchievedRef.current !== rewardId) {
      triggerConfettiInElement(confettiCanvasRef.current);
      localStorage.setItem(celebratedKey, 'true');
      previousAchievedRef.current = rewardId;
      
      toast({
        title: "🎉 Parabéns!",
        description: `Você conquistou: ${rewardData.nextReward.name}!`,
      });
    }
  }, [rewardData, triggerConfettiInElement, toast]);

  // Load period stats when dateFilter changes
  const loadPeriodStats = async (period: DateFilter) => {
    setIsLoadingPeriodStats(true);
    try {
      const { data, error } = await supabase.rpc('get_user_stats_by_period', {
        p_period: period,
        p_start_date: null,
        p_end_date: null
      });
      if (error) throw error;
      if (data) {
        setPeriodStats(data as unknown as PeriodStats);
      }
    } catch (error) {
      console.error('Error loading period stats:', error);
    } finally {
      setIsLoadingPeriodStats(false);
    }
  };

  // Load period stats when dateFilter changes
  useEffect(() => {
    if (isAuthenticated) {
      loadPeriodStats(dateFilter);
    }
  }, [dateFilter, isAuthenticated]);

  // Load chart data from RPC (aggregated directly in database)
  const loadChartData = async (filter: ChartFilter) => {
    setIsLoadingChart(true);
    try {
      if (filter === 'today') {
        const { data, error } = await supabase.rpc('get_user_chart_data_by_hour');
        if (error) throw error;
        
        // Create lookup map for existing data
        const dataByHour = new Map<number, { gerados: number; pagos: number; valor_pago: number }>();
        if (data) {
          data.forEach((row: { hour_brazil: number; gerados: number; pagos: number; valor_pago: number }) => {
            dataByHour.set(row.hour_brazil, {
              gerados: Number(row.gerados) || 0,
              pagos: Number(row.pagos) || 0,
              valor_pago: Number(row.valor_pago) || 0
            });
          });
        }
        
        // Generate all 24 hours (0-23), filling with 0 where no data exists
        const formattedData: ChartData[] = [];
        for (let hour = 0; hour < 24; hour++) {
          const hourData = dataByHour.get(hour);
          formattedData.push({
            date: String(hour).padStart(2, '0') + ':00',
            gerados: hourData?.gerados || 0,
            pagos: hourData?.pagos || 0,
            valorPago: hourData?.valor_pago || 0
          });
        }
        
        setChartData(formattedData);
      } else {
        const days = filter === '7days' ? 7 : filter === '14days' ? 14 : 30;
        const { data, error } = await supabase.rpc('get_user_chart_data_by_day', { p_days: days });
        if (error) throw error;
        
        // Create lookup map by date
        const dataByDate = new Map<string, { gerados: number; pagos: number; valor_pago: number }>();
        if (data) {
          data.forEach((row: { date_brazil: string; gerados: number; pagos: number; valor_pago: number }) => {
            dataByDate.set(row.date_brazil, {
              gerados: Number(row.gerados) || 0,
              pagos: Number(row.pagos) || 0,
              valor_pago: Number(row.valor_pago) || 0
            });
          });
        }
        
        // Generate all days in the period (from X days ago until today)
        const formattedData: ChartData[] = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          
          // Format YYYY-MM-DD for lookup
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;
          
          const dayData = dataByDate.get(dateKey);
          formattedData.push({
            date: `${day}/${month}`,
            gerados: dayData?.gerados || 0,
            pagos: dayData?.pagos || 0,
            valorPago: dayData?.valor_pago || 0
          });
        }
        
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Load chart data when chartFilter changes
  useEffect(() => {
    if (isAuthenticated) {
      loadChartData(chartFilter);
    }
  }, [chartFilter, isAuthenticated]);

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
      const [userSettingsResult, statsResult, rewardsResult, defaultFeeResult, availableBalanceResult, profileResult] = await Promise.all([supabase.rpc('get_user_settings'), supabase.rpc('get_user_dashboard_v2'), supabase.from('rewards').select('id, name, threshold_amount, image_url').eq('is_active', true).order('threshold_amount', {
        ascending: true
      }), supabase.from('fee_configs').select('pix_percentage, pix_fixed').eq('is_default', true).maybeSingle(), supabase.rpc('get_user_available_balance'), user?.id ? supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle() : Promise.resolve({
        data: null,
        error: null
      })]);

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

      // Set user name from profile
      if (!profileResult.error && profileResult.data?.full_name) {
        setUserName(profileResult.data.full_name);
      }

      // Load global banner (visible to all users)
      supabase.rpc('get_global_banner_url').then(({ data, error }) => {
        setIsBannerLoading(false);
        if (!error && data) {
          setBannerUrl(data);
        }
      });

      // Process settings and fee config
      let feeData = defaultFeeResult.data;
      if (userSettingsResult.data) {
        const settings = userSettingsResult.data as {
          key: string;
          value: string;
        }[];
        const feeConfigSetting = settings.find(s => s.key === 'user_fee_config');
        const userFeeConfigId = feeConfigSetting?.value || null;

        // Banner is now loaded globally (not per user) - removed from here

        // Load user-specific fee config if exists
        if (userFeeConfigId) {
          supabase.from('fee_configs').select('pix_percentage, pix_fixed').eq('id', userFeeConfigId).maybeSingle().then(({
            data
          }) => {
            if (data) setFeeConfig(data as FeeConfig);
          });
        }
      }
      // Load transactions for local stats calculations
      supabase.rpc('get_user_transactions', {
        p_limit: 100
      }).then(({
        data,
        error
      }) => {
        if (!error && data) {
          const newTx = data as unknown as Transaction[] || [];
          setTransactions(newTx);
        }
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
  // Chart data is now loaded from RPC via loadChartData function
  // Use periodStats from RPC for accurate counts (bypasses Supabase row limit)
  const filteredStats = useMemo(() => {
    const pendingCount = periodStats.total_generated;
    const paid = periodStats.total_paid;
    const expiredCount = periodStats.total_expired;
    // Total real = pendentes + pagos + expirados
    const totalTransactions = pendingCount + paid + expiredCount;
    // Net amounts already calculated in RPC (total_amount_paid - total_fees)
    const amountPaid = periodStats.total_amount_paid - periodStats.total_fees;
    const amountGenerated = periodStats.total_amount_generated;
    const ticketMedio = paid > 0 ? amountPaid / paid : 0;
    return {
      generated: totalTransactions,
      paid,
      amountGenerated,
      amountPaid,
      // Conversão = pagos / total de transações geradas
      conversionRate: totalTransactions > 0 ? (paid / totalTransactions * 100).toFixed(1) : '0',
      ticketMedio
    };
  }, [periodStats]);

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

  // Permission check - AFTER all hooks
  if (!permissionsLoading && !isOwner && !hasPermission('can_view_dashboard')) {
    return <AccessDenied message="Você não tem permissão para visualizar o Dashboard." />;
  }

  return <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Bem Vindo de volta {userName ? <><span className="text-primary">{userName}</span> </> : ''}!
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Acompanhe o resumo que fizemos pra você.    
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
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="7days">7 dias</SelectItem>
                <SelectItem value="15days">15 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setHideData(!hideData)} title={hideData ? "Mostrar dados" : "Ocultar dados"}>
              {hideData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={async () => {
              await Promise.all([
                loadData(false),
                loadPeriodStats(dateFilter),
                loadChartData(chartFilter)
              ]);
              toast({
                title: "Atualizado",
                description: "Todos os dados foram atualizados"
              });
            }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Banner */}
      {isBannerLoading ? (
        <div className="rounded-lg overflow-hidden border border-border h-[100px] sm:h-[150px] lg:h-[200px] bg-muted animate-pulse" />
      ) : bannerUrl ? (
        <div className="rounded-lg overflow-hidden border border-border">
          <div className={`relative ${!isBannerImageLoaded ? 'h-[100px] sm:h-[150px] lg:h-[200px] bg-muted animate-pulse' : ''}`}>
            <img 
              src={bannerUrl} 
              alt="Banner do Dashboard" 
              className={`w-full h-auto object-cover max-h-[100px] sm:max-h-[150px] lg:max-h-[200px] transition-opacity duration-300 ${isBannerImageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setIsBannerImageLoaded(true)}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
                setIsBannerImageLoaded(true);
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Stats Grid - Unified */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
        {/* Row 1: PIX Gerados | PIX Pagos */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Vendas pendentes</p>
              <QrCode className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{hideData ? "•••" : filteredStats.generated}</p>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-0.5">{maskValue(filteredStats.amountGenerated)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Vendas aprovadas</p>
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
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{maskValue(stats.month_amount_paid)}</p>
          </CardContent>
        </Card>
        {/* Row 3: Vendas Hoje | Saldo Disponível */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Vendas Hoje</p>
              <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-green-500" />
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mt-1">{maskValue(stats.today_amount_paid)}</p>
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
        <Card className="xl:col-span-2 h-full min-w-0 flex flex-col">
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
          <CardContent className="p-4 sm:p-6">
            {/* Container com aspect-ratio para forçar largura 100% imediatamente */}
            <div 
              className="w-full relative"
              style={{ aspectRatio: '16 / 5', minHeight: '180px', maxHeight: '300px' }}
            >
              <div
                className={`w-full h-full transition-opacity duration-300 ${
                  isLoadingChart
                    ? (chartData.length > 0 ? "opacity-60" : "opacity-0")
                    : "opacity-100"
                }`}
              >
                <ResponsiveContainer width="100%" height="100%" debounce={0}>
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 10,
                      left: 10,
                      bottom: isTabletOrSmaller || chartFilter === '30days' ? 40 : 5,
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
                      tick={{
                        fontSize: 10,
                        fill: 'hsl(var(--muted-foreground))',
                      }}
                      angle={isTabletOrSmaller ? -90 : chartFilter === '30days' ? -45 : 0}
                      textAnchor={isTabletOrSmaller || chartFilter === '30days' ? 'end' : 'middle'}
                      tickLine={false}
                      axisLine={{
                        stroke: 'hsl(var(--foreground))',
                        strokeWidth: 1,
                      }}
                      interval={0}
                      ticks={
                        chartFilter === 'today'
                          ? ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
                          : undefined
                      }
                      height={isTabletOrSmaller ? 50 : chartFilter === '30days' ? 60 : 30}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: 'hsl(var(--muted-foreground))',
                      }}
                      tickLine={false}
                      axisLine={{
                        stroke: 'hsl(var(--foreground))',
                        strokeWidth: 1,
                      }}
                      allowDecimals={false}
                      width={30}
                      domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.18))]}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                      }}
                      labelStyle={{
                        color: 'hsl(var(--foreground))',
                        fontWeight: 600,
                        marginBottom: '6px',
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
                      isAnimationActive={false}
                      dot={false}
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Overlay de loading (sem desmontar o gráfico) */}
              {isLoadingChart && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-3">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/50 animate-pulse" />
                    <span className="text-sm text-muted-foreground">
                      {chartData.length > 0 ? 'Atualizando gráfico...' : 'Carregando gráfico...'}
                    </span>
                  </div>
                </div>
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
          <Card className="shadow-xl">
            <CardContent className="p-5">
              {isLoadingRewards ? <div className="space-y-4 animate-pulse">
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
                </div> : rewardData ? (() => {
                  const { nextReward, progress, achieved } = rewardData;
                  
                  return <div className="space-y-4 relative">
                    {/* Canvas para confete dentro do card */}
                    <canvas 
                      ref={confettiCanvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    />
                    <div
                      key={nextReward.id} 
                      className={`space-y-4 p-4 rounded-xl transition-all duration-500 ${
                        achieved 
                          ? 'bg-gradient-to-br from-green-500/15 via-emerald-500/10 to-transparent border-2 border-green-500/50 shadow-lg shadow-green-500/20' 
                          : ''
                      }`}
                    >
                        {/* Nome do usuário e status */}
                        <div className="text-center">
                          {userName && <p className="text-sm text-muted-foreground mb-1">{userName}</p>}
                          <h3 className="text-base font-bold">{nextReward.name}</h3>
                          {achieved && <Badge className="bg-green-500 text-white mt-1 px-3 py-0.5 text-xs animate-pulse">
                              🎉 Conquistado!
                            </Badge>}
                        </div>
                        
                        {/* Imagem da placa */}
                        <div className="flex justify-center">
                          <div className="relative">
                            {nextReward.image_url ? <img 
                              src={nextReward.image_url} 
                              alt={nextReward.name} 
                              className={`relative w-56 h-56 object-contain transition-all duration-500 ${
                                achieved 
                                  ? 'scale-105 drop-shadow-[0_0_25px_rgba(34,197,94,0.4)]' 
                                  : 'drop-shadow-xl'
                              }`} 
                            /> : <div className={`relative w-56 h-56 flex items-center justify-center transition-all duration-500 ${
                                achieved ? 'scale-105' : ''
                              }`}>
                                <Trophy className={`h-20 w-20 transition-all duration-500 ${
                                  achieved 
                                    ? 'text-yellow-500 drop-shadow-[0_0_25px_rgba(234,179,8,0.5)]' 
                                    : 'text-primary drop-shadow-xl'
                                }`} />
                              </div>}
                          </div>
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Progresso</span>
                            <span className={`font-bold ${achieved ? 'text-green-500' : 'text-primary'}`}>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-500 ${achieved ? 'bg-green-500' : 'bg-gradient-to-r from-primary via-red-400 to-red-500'} shadow-lg`} style={{
                        width: `${progress}%`
                      }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{maskValue(stats.total_amount_paid)}</span>
                            <span>Meta: {maskValue(nextReward.threshold_amount)}</span>
                          </div>
                        </div>
                      </div>
                  
                      {/* Botão Resgatar */}
                      <div className="flex justify-center">
                        {achieved ? (
                          <Button className="bg-green-500 hover:bg-green-600 text-white font-medium py-1 px-3 text-[10px] shadow-lg shadow-green-500/30 animate-pulse">
                            <Gift className="h-3 w-3 mr-1" />
                            Resgatar Recompensa
                          </Button>
                        ) : (
                          <Button disabled className="bg-muted text-muted-foreground font-medium py-1 px-3 text-[10px] cursor-not-allowed opacity-60">
                            <Gift className="h-3 w-3 mr-1" />
                            Resgatar Recompensa
                          </Button>
                        )}
                      </div>
                    </div>;
                })() : <div className="text-center py-4">
                  <div className="p-2 bg-primary/10 rounded-full w-fit mx-auto mb-2">
                    <Trophy className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">Nenhuma recompensa disponível</p>
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default AdminDashboard;