import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Loader2, ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";

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
  utm_data: { utm_term?: string; utm_source?: string } | null;
  acquirer: string | null;
  total_count: number;
}

type DateFilter = 'all' | 'today' | 'yesterday' | '7days' | '15days' | 'month' | 'year' | 'custom';
type StatusFilter = 'all' | 'generated' | 'paid' | 'expired';

const ITEMS_PER_PAGE = 10;

export const TransacoesGlobaisSection = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter, debouncedSearch, dateRange]);

  // Load all transactions once
  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      let allTxs: Transaction[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      console.log('[TransacoesGlobais] Iniciando carregamento de transações...');

      while (hasMore) {
        const { data, error } = await supabase.rpc('get_global_transactions_v2', {
          p_limit: batchSize,
          p_offset: offset,
          p_status: null,
          p_date_filter: null,
          p_email_search: null
        });

        if (error) throw error;

        const txData = (data as unknown as Transaction[]) || [];
        allTxs = [...allTxs, ...txData];
        
        console.log(`[TransacoesGlobais] Batch carregado: ${txData.length} transações, total: ${allTxs.length}`);
        
        hasMore = txData.length > 0 && txData.length === batchSize;
        offset += batchSize;
      }

      console.log(`[TransacoesGlobais] Carregamento completo: ${allTxs.length} transações`);
      setAllTransactions(allTxs);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllTransactions();
  }, [loadAllTransactions]);

  // Filter transactions client-side
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    // Get current date references
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter by predefined date periods
    if (dateFilter === 'today') {
      filtered = filtered.filter(tx => new Date(tx.created_at) >= startOfToday);
    } else if (dateFilter === 'yesterday') {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate >= startOfYesterday && txDate < startOfToday;
      });
    } else if (dateFilter === '7days') {
      const start7Days = new Date(startOfToday);
      start7Days.setDate(start7Days.getDate() - 7);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= start7Days);
    } else if (dateFilter === '15days') {
      const start15Days = new Date(startOfToday);
      start15Days.setDate(start15Days.getDate() - 15);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= start15Days);
    } else if (dateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= startOfMonth);
    } else if (dateFilter === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= startOfYear);
    } else if (dateFilter === 'custom' && dateRange?.from) {
      const start = new Date(dateRange.from);
      start.setHours(0, 0, 0, 0);
      const end = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate >= start && txDate <= end;
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Filter by search query (email, name, product, txid)
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter(tx => 
        (tx.user_email?.toLowerCase().includes(search)) ||
        (tx.donor_name?.toLowerCase().includes(search)) ||
        (tx.product_name?.toLowerCase().includes(search)) ||
        (tx.txid?.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [allTransactions, dateFilter, statusFilter, debouncedSearch, dateRange]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalCount = filteredTransactions.length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range || { from: undefined, to: undefined });
    if (range?.from) {
      setDateFilter('custom');
    }
  };

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
        return <Badge className="bg-red-500/80 text-white border-red-500/50">Gerado</Badge>;
    }
  };

  const getAcquirerBadge = (acquirer: string | null) => {
    switch (acquirer?.toLowerCase()) {
      case 'inter':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Inter</Badge>;
      case 'ativus':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Ativus</Badge>;
      case 'valorion':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Valorion</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
    }
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Hoje';
      case 'yesterday': return 'Ontem';
      case '7days': return '7 dias';
      case '15days': return '15 dias';
      case 'month': return 'Este mês';
      case 'year': return 'Este ano';
      case 'custom': return 'Personalizado';
      default: return 'Período';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Transações Globais
          <Badge variant="secondary" className="ml-2 text-xs">{totalCount}</Badge>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[140px] sm:w-[180px] h-8 text-xs sm:text-sm pl-7"
            />
          </div>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            className="h-8"
            placeholder="Data"
          />
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs sm:text-sm">
              <SelectValue>
                {statusFilter === 'all' ? 'Status' : statusFilter === 'paid' ? 'Pago' : statusFilter === 'generated' ? 'Gerado' : 'Expirado'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="generated">Gerado</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <SelectValue>{getDateFilterLabel()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="15days">15 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma transação encontrada
          </p>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Produto</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Adquirente</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Posicionamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">
                        {tx.user_email || '-'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[60px] truncate">
                        {tx.donor_name || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell max-w-[100px] truncate">
                        {tx.product_name || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-medium whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getStatusBadge(tx.status)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getAcquirerBadge(tx.acquirer)}
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell max-w-[100px] truncate">
                        {tx.utm_data?.utm_term || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, totalCount)} de {totalCount}
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
  );
};