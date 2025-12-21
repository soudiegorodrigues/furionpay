import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Loader2, ChevronLeft, ChevronRight, Calendar, Search, CheckCircle, AlertCircle, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import TransactionDetailsSheet from "@/components/TransactionDetailsSheet";

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
  
  // Transaction verification states
  const [txidToVerify, setTxidToVerify] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  
  // Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTransaction, setSheetTransaction] = useState<any>(null);

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

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setDateFilter('all');
    setStatusFilter('all');
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
    toast.success("Filtros limpos!");
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

  // Helper para validar UUID
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Verificar transação por TXID - busca nas transações já carregadas (que vem da RPC de admin)
  const handleVerifyTransaction = async () => {
    if (!txidToVerify.trim()) {
      toast.error("Digite o TXID da transação");
      return;
    }

    setIsVerifying(true);
    try {
      const searchValue = txidToVerify.trim().toLowerCase();
      
      // Primeiro busca nas transações já carregadas (que vieram via RPC de admin)
      let matchedTx = transactions.find((tx) => 
        tx.txid?.toLowerCase() === searchValue || 
        tx.id?.toLowerCase() === searchValue ||
        tx.txid?.toLowerCase().includes(searchValue) ||
        tx.id?.toLowerCase().includes(searchValue)
      );

      // Se não encontrou nas já carregadas, busca via RPC com mais transações
      if (!matchedTx) {
        const { data: results, error } = await supabase.rpc('get_global_transactions_v2', {
          p_limit: 5000,
          p_offset: 0
        });

        if (error) throw error;

        matchedTx = (results as Transaction[] | null)?.find((tx) => 
          tx.txid?.toLowerCase() === searchValue || 
          tx.id?.toLowerCase() === searchValue ||
          tx.txid?.toLowerCase().includes(searchValue) ||
          tx.id?.toLowerCase().includes(searchValue)
        );
      }

      if (!matchedTx) {
        toast.error("Transação não encontrada com esse TXID/ID");
        return;
      }

      // Map to Transaction type
      const tx: Transaction = {
        id: matchedTx.id,
        amount: matchedTx.amount,
        status: matchedTx.status,
        txid: matchedTx.txid || '',
        donor_name: matchedTx.donor_name || '',
        product_name: matchedTx.product_name,
        created_at: matchedTx.created_at || '',
        paid_at: matchedTx.paid_at,
        user_email: matchedTx.user_email,
        utm_data: matchedTx.utm_data as { utm_term?: string; utm_source?: string } | undefined,
        acquirer: matchedTx.acquirer,
        total_count: 0
      };
      
      setSelectedTransaction(tx);
      setVerifyDialogOpen(true);
    } catch (error: any) {
      console.error('Error finding transaction:', error);
      toast.error("Erro ao buscar transação: " + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Marcar transação como paga manualmente
  const handleMarkAsPaid = async () => {
    if (!selectedTransaction) return;

    setIsMarkingPaid(true);
    try {
      const { error } = await supabase.rpc('mark_pix_paid', {
        p_txid: selectedTransaction.txid
      });

      if (error) throw error;

      toast.success(`Transação marcada como PAGA! Valor: R$ ${selectedTransaction.amount.toFixed(2)}`);
      setVerifyDialogOpen(false);
      setSelectedTransaction(null);
      setTxidToVerify("");
      
      // Recarregar transações
      loadAllTransactions();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast.error("Erro ao marcar como pago: " + error.message);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // Verificar status na adquirente
  const handleCheckAcquirerStatus = async () => {
    if (!selectedTransaction) return;

    setIsVerifying(true);
    try {
      console.log('Verificando status na adquirente para:', selectedTransaction.txid);
      
      const { data, error } = await supabase.functions.invoke('check-pix-status', {
        body: { transactionId: selectedTransaction.txid }
      });

      console.log('Resposta da adquirente:', data, error);

      if (error) throw error;

      // Verificar se já está pago (pode vir de diferentes formas da API)
      if (data?.paid || data?.isPaid || data?.status === 'paid' || data?.status === 'PAID') {
        toast.success("✅ Transação CONFIRMADA como PAGA!");
        setTimeout(() => {
          loadAllTransactions();
          setVerifyDialogOpen(false);
          setSelectedTransaction(null);
          setTxidToVerify("");
        }, 1000);
      } else if (data?.status === 'expired' || data?.status === 'EXPIRED') {
        toast.warning("⚠️ Transação EXPIRADA na adquirente");
      } else if (data?.status === 'pending' || data?.status === 'PENDING' || data?.status === 'ATIVA') {
        toast.info("⏳ Transação ainda PENDENTE de pagamento");
      } else {
        toast.info(`Status na adquirente: ${data?.status || 'Aguardando pagamento'}`);
      }
    } catch (error: any) {
      console.error('Error checking acquirer status:', error);
      toast.error("Erro ao verificar na adquirente: " + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle row click to open sheet
  const handleRowClick = (tx: Transaction) => {
    setSheetTransaction({
      ...tx,
      fee_percentage: 0,
      fee_fixed: 0,
      popup_model: null
    });
    setSheetOpen(true);
  };

  // Calculate net amount for sheet
  const calculateNetAmount = (amount: number, feePercentage?: number | null, feeFixed?: number | null) => {
    const pct = feePercentage || 0;
    const fixed = feeFixed || 0;
    return amount - (amount * pct / 100) - fixed;
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Transações Globais
            <Badge variant="secondary" className="ml-2 text-xs">{totalCount}</Badge>
          </CardTitle>
        </div>

        {/* Verificar Transação - Suporte */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-muted-foreground">Suporte:</span>
          <Input
            placeholder="Cole o TXID para verificar..."
            value={txidToVerify}
            onChange={(e) => setTxidToVerify(e.target.value)}
            className="flex-1 h-8 text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyTransaction()}
          />
          <Button 
            size="sm" 
            onClick={handleVerifyTransaction}
            disabled={isVerifying || !txidToVerify.trim()}
            className="h-8"
          >
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Verificar</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <div className="relative col-span-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar email, nome, produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[200px] h-8 text-xs sm:text-sm pl-7"
            />
          </div>
          
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            className="h-8 w-full sm:w-auto"
            placeholder="Período"
          />
          
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs sm:text-sm">
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
            <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs sm:text-sm">
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

          <Button 
            onClick={loadAllTransactions} 
            variant="default"
            size="sm"
            className="h-8"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Buscar</span>
          </Button>

          <Button 
            onClick={handleClearFilters} 
            variant="outline"
            size="sm"
            className="h-8"
          >
            <X className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Limpar</span>
          </Button>
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
                    <TableRow 
                      key={tx.id} 
                      onClick={() => handleRowClick(tx)}
                      className="cursor-pointer"
                    >
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

    {/* Dialog de verificação de transação */}
    <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
      <DialogContent className="w-[95vw] max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Verificar Transação
          </DialogTitle>
          <DialogDescription>
            Detalhes da transação encontrada
          </DialogDescription>
        </DialogHeader>

        {selectedTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="md:col-span-2">
                <p className="text-muted-foreground text-xs">TXID</p>
                <p className="font-mono text-xs break-all">{selectedTransaction.txid}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status Atual</p>
                <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium break-words">{selectedTransaction.donor_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Valor</p>
                <p className="font-medium text-green-500">{formatCurrency(selectedTransaction.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Adquirente</p>
                <div className="mt-1">{getAcquirerBadge(selectedTransaction.acquirer)}</div>
              </div>
              <div className="md:col-span-2">
                <p className="text-muted-foreground text-xs">Criado em</p>
                <p className="text-xs">{formatDate(selectedTransaction.created_at)}</p>
              </div>
            </div>

            {selectedTransaction.status === 'paid' ? (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-green-500 text-sm">Transação já está PAGA</p>
                  <p className="text-xs text-muted-foreground">Pago em: {formatDate(selectedTransaction.paid_at)}</p>
                </div>
              </div>
            ) : selectedTransaction.status === 'expired' ? (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">Transação expirada - não pode ser marcada como paga</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-black dark:text-white">Transação pendente de pagamento</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="!flex !flex-col gap-2 mt-4">
          {selectedTransaction?.status === 'generated' && (
            <>
              <Button
                onClick={handleMarkAsPaid}
                disabled={isMarkingPaid}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isMarkingPaid ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Marcar como Pago
              </Button>
              <Button
                variant="outline"
                onClick={handleCheckAcquirerStatus}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Verificar na Adquirente
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => setVerifyDialogOpen(false)} className="w-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Sheet lateral de detalhes */}
    <TransactionDetailsSheet
      transaction={sheetTransaction}
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      calculateNetAmount={calculateNetAmount}
    />
    </>
  );
};