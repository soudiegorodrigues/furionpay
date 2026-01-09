import { useState, useEffect, useMemo, useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AccessDenied } from "@/components/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  BarChart3
} from "lucide-react";
import TransactionDetailsSheet from "@/components/TransactionDetailsSheet";
import { CalendarIcon } from "lucide-react";
import { UTMData, getUtmValue, getTrafficSource } from "@/lib/utmHelpers";

interface OrderBumpItem {
  id: string;
  price: number;
  name?: string;
  title?: string;
  product_name?: string;
}

interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired' | 'refunded';
  txid: string;
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
  fee_percentage: number | null;
  fee_fixed: number | null;
  utm_data: UTMData | null;
  popup_model: string | null;
  acquirer?: string;
  order_bumps?: OrderBumpItem[] | null;
  client_ip?: string | null;
  offer_code?: string | null;
  offer_domain?: string | null;
}

interface FeeConfig {
  pix_percentage: number;
  pix_fixed: number;
}

interface PeriodStats {
  total_generated: number;
  total_paid: number;
  total_expired: number;
  total_amount_generated: number;
  total_amount_paid: number;
  total_fees: number;
}

const ITEMS_PER_PAGE = 10;
type DateFilter = 'today' | 'yesterday' | '7days' | '15days' | 'month' | 'year' | 'all';
type PlatformFilter = 'all' | 'facebook' | 'google' | 'tiktok' | 'other';
type StatusFilter = 'all' | 'paid' | 'generated' | 'refunded';

const AdminVendas = () => {
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const { isAuthenticated, isAdmin } = useAdminAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [periodStats, setPeriodStats] = useState<PeriodStats>({
    total_generated: 0,
    total_paid: 0,
    total_expired: 0,
    total_amount_generated: 0,
    total_amount_paid: 0,
    total_fees: 0
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate net amount after fee deduction
  const calculateNetAmount = (grossAmount: number, storedFeePercentage?: number | null, storedFeeFixed?: number | null): number => {
    if (storedFeePercentage !== null && storedFeePercentage !== undefined && storedFeeFixed !== null && storedFeeFixed !== undefined) {
      const fee = grossAmount * storedFeePercentage / 100 + storedFeeFixed;
      return Math.max(0, grossAmount - fee);
    }
    if (!feeConfig) return grossAmount;
    const fee = grossAmount * feeConfig.pix_percentage / 100 + feeConfig.pix_fixed;
    return Math.max(0, grossAmount - fee);
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
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">Pago</Badge>;
      case 'expired':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">Expirado</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0">Reembolsado</Badge>;
      default:
        return <Badge className="bg-red-500/80 text-white border-red-500/50 text-[10px] px-1.5 py-0">Gerado</Badge>;
    }
  };

  // Facebook icon with blue circle background
  const FacebookIcon = () => (
    <svg viewBox="0 0 48 48" className="h-5 w-5 mx-auto">
      <circle cx="24" cy="24" r="24" fill="#1877F2" />
      <path d="M32.5 24.5H27V33H22V24.5H18V20H22V17C22 13.7 24.2 11 28 11H32V15.5H29C27.6 15.5 27 16.3 27 17.5V20H32L32.5 24.5Z" fill="white" />
    </svg>
  );

  // Google icon with official colors
  const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" className="h-5 w-5 mx-auto">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );

  // TikTok icon with official colors
  const TiktokIcon = () => (
    <svg viewBox="0 0 48 48" className="h-5 w-5 mx-auto">
      <circle cx="24" cy="24" r="24" fill="#000000" />
      <path d="M33.5 17.5V21.5C31.3 21.5 29.3 20.8 27.7 19.6V28.5C27.7 32.9 24.1 36.5 19.7 36.5C15.3 36.5 11.7 32.9 11.7 28.5C11.7 24.1 15.3 20.5 19.7 20.5C20.2 20.5 20.7 20.6 21.2 20.7V24.8C20.7 24.6 20.2 24.5 19.7 24.5C17.5 24.5 15.7 26.3 15.7 28.5C15.7 30.7 17.5 32.5 19.7 32.5C21.9 32.5 23.7 30.7 23.7 28.5V11.5H27.7C27.7 11.5 27.7 11.7 27.7 12C28 14.7 30.5 16.9 33.5 17.5Z" fill="white" />
      <path d="M32 16C32 16 32 16.2 32 16.5C32.3 19.2 34.8 21.4 37.8 22V18C35.6 17.4 33.8 15.5 33.3 13H29.3V29C29.3 31.2 27.5 33 25.3 33C23.1 33 21.3 31.2 21.3 29C21.3 26.8 23.1 25 25.3 25C25.8 25 26.3 25.1 26.8 25.3V21.2C26.3 21.1 25.8 21 25.3 21C20.9 21 17.3 24.6 17.3 29C17.3 33.4 20.9 37 25.3 37C29.7 37 33.3 33.4 33.3 29V20.1C34.9 21.3 36.9 22 39.1 22V18C36.8 18 34.8 17.3 33.3 16H32Z" fill="#25F4EE" />
      <path d="M32 16C32 16 32 16.2 32 16.5C32.3 19.2 34.8 21.4 37.8 22V18C35.6 17.4 33.8 15.5 33.3 13H29.3V29C29.3 31.2 27.5 33 25.3 33C23.1 33 21.3 31.2 21.3 29C21.3 26.8 23.1 25 25.3 25C25.8 25 26.3 25.1 26.8 25.3V21.2C26.3 21.1 25.8 21 25.3 21C20.9 21 17.3 24.6 17.3 29C17.3 33.4 20.9 37 25.3 37C29.7 37 33.3 33.4 33.3 29V20.1C34.9 21.3 36.9 22 39.1 22V18C36.8 18 34.8 17.3 33.3 16H32Z" fill="#FE2C55" fillOpacity="0.8" />
    </svg>
  );

  // Load fee config
  const loadFeeConfig = useCallback(async () => {
    try {
      const [userSettingsResult, defaultFeeResult] = await Promise.all([
        supabase.rpc('get_user_settings'),
        supabase.from('fee_configs').select('pix_percentage, pix_fixed').eq('is_default', true).maybeSingle()
      ]);

      let feeData = defaultFeeResult.data;
      if (userSettingsResult.data) {
        const settings = userSettingsResult.data as { key: string; value: string }[];
        const feeConfigSetting = settings.find(s => s.key === 'user_fee_config');
        const userFeeConfigId = feeConfigSetting?.value || null;

        if (userFeeConfigId) {
          const { data } = await supabase.from('fee_configs')
            .select('pix_percentage, pix_fixed')
            .eq('id', userFeeConfigId)
            .maybeSingle();
          if (data) feeData = data;
        }
      }
      if (feeData) {
        setFeeConfig(feeData as FeeConfig);
      }
    } catch (error) {
      console.error('Error loading fee config:', error);
    }
  }, []);

  // Load period stats
  const loadPeriodStats = useCallback(async (period: DateFilter, status: StatusFilter, platform: PlatformFilter) => {
    try {
      const { data, error } = await supabase.rpc('get_user_stats_by_period', {
        p_period: period,
        p_start_date: null,
        p_end_date: null,
        p_status: status,
        p_platform: platform
      });
      if (error) throw error;
      if (data) {
        setPeriodStats(data as unknown as PeriodStats);
      }
    } catch (error) {
      console.error('Error loading period stats:', error);
    }
  }, []);

  // Load transactions with server-side pagination
  const loadTransactions = useCallback(async (isPaginationChange = false) => {
    // Se é paginação, usa estado sutil; senão, mostra loading completo na primeira carga
    if (isPaginationChange) {
      setIsPaginating(true);
    } else if (transactions.length === 0) {
      setIsInitialLoading(true);
    }
    
    try {
      const { data, error } = await supabase.rpc('get_user_transactions_paginated', {
        p_page: currentPage,
        p_items_per_page: ITEMS_PER_PAGE,
        p_date_filter: dateFilter,
        p_start_date: null,
        p_end_date: null,
        p_status_filter: statusFilter,
        p_search: debouncedSearch || '',
        p_platform_filter: platformFilter
      });

      if (error) throw error;
      
      const result = data as unknown as { transactions: Transaction[]; total: number };
      setTransactions(result.transactions || []);
      setTotalCount(result.total || 0);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    } finally {
      setIsInitialLoading(false);
      setIsPaginating(false);
    }
  }, [currentPage, dateFilter, statusFilter, platformFilter, debouncedSearch, toast, transactions.length]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadFeeConfig();
    }
  }, [isAuthenticated, loadFeeConfig]);

  // Load transactions when filters change (not pagination)
  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions(false); // false = não é paginação
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, dateFilter, statusFilter, platformFilter, debouncedSearch]);

  // Load transactions when page changes (pagination)
  useEffect(() => {
    if (isAuthenticated && currentPage > 0) {
      loadTransactions(true); // true = é paginação
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Load stats when filters change
  useEffect(() => {
    if (isAuthenticated) {
      loadPeriodStats(dateFilter, statusFilter, platformFilter);
    }
  }, [dateFilter, statusFilter, platformFilter, isAuthenticated, loadPeriodStats]);

  // Realtime subscription for transaction updates
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('[AdminVendas] Configurando realtime subscription...');
    
    const channel = supabase
      .channel('seller-transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pix_transactions'
        },
        (payload) => {
          console.log('[AdminVendas] Realtime event:', payload.eventType, payload);
          
          // Reload transactions and stats when any change happens
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            toast({
              title: "📥 Atualização",
              description: payload.eventType === 'INSERT' 
                ? "Nova transação recebida!" 
                : "Transação atualizada!",
            });
            loadTransactions(false);
            loadPeriodStats(dateFilter, statusFilter, platformFilter);
          }
        }
      )
      .subscribe((status) => {
        console.log('[AdminVendas] Realtime status:', status);
      });

    return () => {
      console.log('[AdminVendas] Removendo realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, loadTransactions, loadPeriodStats, dateFilter, statusFilter, platformFilter, toast]);

  // Reset page when filters change (except page itself)
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter, platformFilter, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Stats calculations based on period stats (from server)
  const stats = useMemo(() => {
    const pendingCount = periodStats.total_generated || 0;
    const paidCount = periodStats.total_paid || 0;
    const expiredCount = periodStats.total_expired || 0;
    // Total real = pendentes + pagos + expirados
    const totalTransactions = pendingCount + paidCount + expiredCount;
    const totalAmount = (periodStats.total_amount_paid || 0) - (periodStats.total_fees || 0);
    // Conversão = pagos / total de transações geradas
    const conversionRate = totalTransactions > 0 ? (paidCount / totalTransactions * 100).toFixed(1) : '0';
    
    return { generated: totalTransactions, paidCount, totalAmount, conversionRate };
  }, [periodStats]);

  // Permission check
  if (!permissionsLoading && !isOwner && !hasPermission('can_view_transactions')) {
    return <AccessDenied message="Você não tem permissão para visualizar as vendas." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-x-clip">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Vendas</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Histórico completo de transações e vendas
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              loadTransactions(false);
              loadPeriodStats(dateFilter, statusFilter, platformFilter);
              toast({ title: "Atualizado", description: "Dados atualizados com sucesso" });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total Vendas</p>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.generated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Aprovadas</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-green-500">{stats.paidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Conversão</p>
              <BarChart3 className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, produto, código ou TXID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-full lg:w-[130px]">
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

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full lg:w-[110px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="generated">Gerado</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
              </SelectContent>
            </Select>

            {/* Platform Filter */}
            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
              <SelectTrigger className="w-full lg:w-[130px]">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="facebook">Facebook/IG</SelectItem>
                <SelectItem value="google">Google/YT</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="other">Outras</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            Transações
            <Badge variant="secondary" className="ml-2">
              {totalCount}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isInitialLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className={`overflow-x-auto -mx-4 sm:mx-0 transition-opacity duration-200 ${isPaginating ? 'opacity-50' : ''}`}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Produto</TableHead>
                      <TableHead className="text-xs">Líquido</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Posicionamento</TableHead>
                      <TableHead className="text-xs text-center">UTM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow 
                        key={tx.id} 
                        className="cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setIsSheetOpen(true);
                        }}
                      >
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{tx.donor_name}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell max-w-[100px] truncate">{tx.product_name || '-'}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap font-medium">
                          {formatCurrency(calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed))}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell className="text-xs hidden lg:table-cell max-w-[100px] truncate">
                          {getUtmValue(tx.utm_data, 'utm_term') || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {getTrafficSource(tx.utm_data) === 'facebook' ? (
                            <FacebookIcon />
                          ) : getTrafficSource(tx.utm_data) === 'google' ? (
                            <GoogleIcon />
                          ) : getTrafficSource(tx.utm_data) === 'tiktok' ? (
                            <TiktokIcon />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                          Nenhuma transação encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isPaginating}
                      className="h-8 px-2 sm:px-3"
                    >
                      {isPaginating && currentPage > 1 ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronLeft className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline ml-1">Anterior</span>
                    </Button>
                    <span className="text-xs sm:text-sm text-muted-foreground px-2">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || isPaginating}
                      className="h-8 px-2 sm:px-3"
                    >
                      <span className="hidden sm:inline mr-1">Próximo</span>
                      {isPaginating && currentPage < totalPages ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
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

export default AdminVendas;
