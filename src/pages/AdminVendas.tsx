import { useState, useEffect, useMemo } from "react";
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
  Calendar, 
  Search,
  Filter,
  Download,
  TrendingUp,
  DollarSign,
  BarChart3
} from "lucide-react";
import TransactionDetailsSheet from "@/components/TransactionDetailsSheet";

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
type StatusFilter = 'all' | 'paid' | 'generated' | 'expired';

const AdminVendas = () => {
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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
      default:
        return <Badge className="bg-red-500/80 text-white border-red-500/50 text-[10px] px-1.5 py-0">Gerado</Badge>;
    }
  };

  const getAcquirerBadge = (acquirer?: string) => {
    if (!acquirer) return <span className="text-muted-foreground">-</span>;
    const colors: Record<string, string> = {
      inter: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      ativus: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      valorion: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return (
      <Badge className={colors[acquirer.toLowerCase()] || 'bg-muted text-muted-foreground'}>
        {acquirer}
      </Badge>
    );
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

  // Load period stats
  const loadPeriodStats = async (period: DateFilter) => {
    try {
      const { data, error } = await supabase.rpc('get_user_stats_by_period', {
        p_period: period
      });
      if (error) throw error;
      if (data) {
        setPeriodStats(data as unknown as PeriodStats);
      }
    } catch (error) {
      console.error('Error loading period stats:', error);
    }
  };

  // Load transactions
  const loadTransactions = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // Load fee config
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

      // Load transactions (initial 100)
      const { data, error } = await supabase.rpc('get_user_transactions', {
        p_limit: 100
      });

      if (error) throw error;
      const txs = data as unknown as Transaction[] || [];
      setTransactions(txs);
      setHasMoreTransactions(txs.length >= 100);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load all transactions when user clicks "Carregar Todas"
  const loadAllTransactions = async () => {
    setIsLoadingMore(true);
    try {
      let allTransactions: Transaction[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      // Fetch in batches of 1000 to bypass PostgREST limit
      while (hasMore) {
        const { data, error } = await supabase.rpc('get_user_transactions', {
          p_limit: batchSize,
          p_offset: offset
        });

        if (error) throw error;
        
        const txs = data as unknown as Transaction[] || [];
        allTransactions = [...allTransactions, ...txs];
        
        // If we got less than batchSize, we've reached the end
        hasMore = txs.length === batchSize;
        offset += batchSize;
      }

      setTransactions(allTransactions);
      setHasMoreTransactions(false);
      // Change filter to "all" so user can see all loaded transactions
      setDateFilter('all');
      setStatusFilter('all');
      toast({
        title: "Sucesso",
        description: `${allTransactions.length} transações carregadas`,
      });
    } catch (error) {
      console.error('Error loading all transactions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar todas as transações",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions();
      loadPeriodStats(dateFilter);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPeriodStats(dateFilter);
    }
  }, [dateFilter, isAuthenticated]);

  // Filter transactions
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
          case 'yesterday':
            const yesterday = new Date(startOfDay);
            yesterday.setDate(yesterday.getDate() - 1);
            return txDate >= yesterday && txDate < startOfDay;
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


    // Filter by search query (name or product)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.donor_name?.toLowerCase().includes(query) ||
        tx.product_name?.toLowerCase().includes(query) ||
        tx.txid?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, dateFilter, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter, searchQuery]);

  // Stats calculations
  const stats = useMemo(() => {
    const paid = filteredTransactions.filter(tx => tx.status === 'paid');
    const generated = filteredTransactions.length;
    const paidCount = paid.length;
    const totalAmount = paid.reduce((sum, tx) => sum + calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed), 0);
    const conversionRate = generated > 0 ? (paidCount / generated * 100).toFixed(1) : '0';
    
    return { generated, paidCount, totalAmount, conversionRate };
  }, [filteredTransactions, feeConfig]);

  // Permission check
  if (!permissionsLoading && !isOwner && !hasPermission('can_view_transactions')) {
    return <AccessDenied message="Você não tem permissão para visualizar as vendas." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
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
              loadPeriodStats(dateFilter);
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
                placeholder="Buscar por nome, produto ou TXID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
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
              <SelectTrigger className="w-full lg:w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="generated">Gerado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
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
              {filteredTransactions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
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
                        <TableCell className="text-xs max-w-[120px] truncate">{tx.donor_name}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell max-w-[100px] truncate">{tx.product_name || '-'}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap font-medium">
                          {formatCurrency(calculateNetAmount(tx.amount, tx.fee_percentage, tx.fee_fixed))}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell className="text-xs hidden lg:table-cell max-w-[100px] truncate">
                          {tx.utm_data?.utm_term || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {tx.utm_data?.utm_source?.toLowerCase().includes('facebook') || 
                           tx.utm_data?.utm_source?.toLowerCase().includes('fb') || 
                           tx.utm_data?.utm_source?.toLowerCase().includes('meta') ? (
                            <FacebookIcon />
                          ) : tx.utm_data?.utm_source?.toLowerCase().includes('google') || 
                               tx.utm_data?.utm_source?.toLowerCase().includes('gads') || 
                               tx.utm_data?.utm_source?.toLowerCase().includes('adwords') ? (
                            <GoogleIcon />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedTransactions.length === 0 && (
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
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-xs text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Load All Button */}
              {hasMoreTransactions && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={loadAllTransactions}
                    disabled={isLoadingMore}
                    className="gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Carregar Todas as Transações
                      </>
                    )}
                  </Button>
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
