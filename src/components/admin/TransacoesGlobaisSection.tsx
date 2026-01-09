import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Loader2, ChevronLeft, ChevronRight, Calendar, Search, CheckCircle, AlertCircle, RefreshCw, X, UserCheck, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import TransactionDetailsSheet from "@/components/TransactionDetailsSheet";
import type { UTMData } from "@/lib/utmHelpers";

interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired' | 'refunded';
  txid: string;
  donor_name: string;
  donor_phone?: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
  user_email: string | null;
  utm_data: UTMData | null;
  acquirer: string | null;
  approved_by_email: string | null;
  is_manual_approval: boolean | null;
  client_ip: string | null;
  offer_code?: string | null;
  offer_domain?: string | null;
}

type DateFilter = 'all' | 'today' | 'yesterday' | '7days' | '15days' | 'month' | 'year';
type StatusFilter = 'all' | 'generated' | 'paid' | 'refunded';

const ITEMS_PER_PAGE = 10;

export const TransacoesGlobaisSection = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  
  // Transaction verification states
  const [txidToVerify, setTxidToVerify] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  
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
  }, [dateFilter, statusFilter, debouncedSearch]);

  // Load transactions with server-side pagination
  const loadTransactions = useCallback(async (isPaginationChange = false) => {
    // Se é paginação, usa estado sutil; senão, mostra loading completo na primeira carga
    if (isPaginationChange) {
      setIsPaginating(true);
    } else if (transactions.length === 0) {
      setIsInitialLoading(true);
    }
    
    try {
      console.log('[TransacoesGlobais] Carregando página:', currentPage, 'filtros:', { dateFilter, statusFilter, debouncedSearch });

      const { data, error } = await supabase.rpc('get_global_transactions_paginated', {
        p_page: currentPage,
        p_per_page: ITEMS_PER_PAGE,
        p_date_filter: dateFilter,
        p_start_date: null,
        p_end_date: null,
        p_status: statusFilter,
        p_search: debouncedSearch || ''
      });

      if (error) {
        console.error('[TransacoesGlobais] Erro RPC:', error);
        toast.error(`Erro ao carregar transações: ${error.message}`);
        throw error;
      }

      const result = data as unknown as { transactions: Transaction[]; total_count: number };
      console.log('[TransacoesGlobais] Resultado:', { transactions: result.transactions?.length, total: result.total_count });

      setTransactions(result.transactions || []);
      setTotalCount(result.total_count || 0);
    } catch (error: any) {
      console.error('[TransacoesGlobais] Erro ao carregar transações:', error);
    } finally {
      setIsInitialLoading(false);
      setIsPaginating(false);
    }
  }, [currentPage, dateFilter, statusFilter, debouncedSearch, transactions.length]);

  // Load transactions when filters change (not pagination)
  useEffect(() => {
    loadTransactions(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, statusFilter, debouncedSearch]);

  // Load transactions when page changes (pagination)
  useEffect(() => {
    if (currentPage > 0) {
      loadTransactions(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Realtime subscription for new transactions
  useEffect(() => {
    console.log('[TransacoesGlobais] Configurando realtime subscription...');
    
    const channel = supabase
      .channel('pix-transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pix_transactions'
        },
        (payload) => {
          console.log('[TransacoesGlobais] Realtime event:', payload.eventType, payload);
          
          // Reload transactions when any change happens
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            toast.info('📥 Nova atualização de transação!', {
              duration: 2000,
              position: 'top-right'
            });
            loadTransactions(false);
          }
        }
      )
      .subscribe((status) => {
        console.log('[TransacoesGlobais] Realtime status:', status);
      });

    return () => {
      console.log('[TransacoesGlobais] Removendo realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, [loadTransactions]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;


  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setDateFilter('all');
    setStatusFilter('all');
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
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Expirado</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Reembolsado</Badge>;
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
      default: return 'Período';
    }
  };

  // Verificar transação por TXID
  const handleVerifyTransaction = async () => {
    if (!txidToVerify.trim()) {
      toast.error("Digite o TXID da transação");
      return;
    }

    setIsVerifying(true);
    try {
      const searchValue = txidToVerify.trim().toLowerCase();
      
      // Busca nas transações já carregadas primeiro
      let matchedTx = transactions.find((tx) => 
        tx.txid?.toLowerCase() === searchValue || 
        tx.id?.toLowerCase() === searchValue ||
        tx.txid?.toLowerCase().includes(searchValue) ||
        tx.id?.toLowerCase().includes(searchValue)
      );

      // Se não encontrou, busca via RPC com busca específica
      if (!matchedTx) {
        const { data, error } = await supabase.rpc('get_global_transactions_paginated', {
          p_page: 1,
          p_per_page: 10,
          p_date_filter: 'all',
          p_status: 'all',
          p_search: txidToVerify.trim()
        });

        if (error) throw error;

        const result = data as unknown as { transactions: Transaction[]; total_count: number };
        matchedTx = result.transactions?.find((tx) => 
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

      setSelectedTransaction(matchedTx);
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
      const { data: { user } } = await supabase.auth.getUser();
      const adminEmail = user?.email || 'unknown';

      const { error } = await supabase.rpc('mark_pix_paid', {
        p_txid: selectedTransaction.txid,
        p_admin_email: adminEmail
      });

      if (error) throw error;

      toast.success(`Transação marcada como PAGA! Valor: R$ ${selectedTransaction.amount.toFixed(2)}`);
      setVerifyDialogOpen(false);
      setSelectedTransaction(null);
      setTxidToVerify("");
      
      loadTransactions();
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

      if (data?.paid || data?.isPaid || data?.status === 'paid' || data?.status === 'PAID') {
        toast.success("✅ Transação CONFIRMADA como PAGA!");
        setTimeout(() => {
          loadTransactions();
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

  // Reverter aprovação manual
  const handleRevertApproval = async () => {
    if (!selectedTransaction) return;

    setIsReverting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminEmail = user?.email || 'unknown';

      const { error } = await supabase.rpc('revert_manual_approval', {
        p_txid: selectedTransaction.txid,
        p_admin_email: adminEmail
      });

      if (error) throw error;

      toast.success(`Aprovação manual revertida! Transação voltou para status "Gerado"`);
      setVerifyDialogOpen(false);
      setSelectedTransaction(null);
      setTxidToVerify("");
      
      loadTransactions();
    } catch (error: any) {
      console.error('Error reverting approval:', error);
      toast.error("Erro ao reverter: " + error.message);
    } finally {
      setIsReverting(false);
    }
  };

  // Handle row click to open sheet
  const handleRowClick = (tx: Transaction) => {
    setSheetTransaction({
      ...tx,
      fee_percentage: 0,
      fee_fixed: 0,
      popup_model: null,
      client_ip: tx.client_ip
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

        {/* Filters Row */}
        <div className="flex flex-col gap-3">
          {/* Search and Date Range */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, nome, produto ou TXID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="15days">Últimos 15 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="generated">Gerado</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTransactions(false)}
              disabled={isInitialLoading || isPaginating}
              className="h-9 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isInitialLoading || isPaginating ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Verify Transaction Section */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <div className="flex-1">
            <Input
              placeholder="Digite o TXID para verificar..."
              value={txidToVerify}
              onChange={(e) => setTxidToVerify(e.target.value)}
              className="text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyTransaction()}
            />
          </div>
          <Button
            onClick={handleVerifyTransaction}
            disabled={isVerifying || !txidToVerify.trim()}
            size="sm"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Search className="h-4 w-4 mr-1" />
            )}
            Verificar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isInitialLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity duration-200 ${isPaginating ? 'opacity-50' : ''}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Usuário</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-center">Adquirente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow 
                      key={tx.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(tx)}
                    >
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">
                        {tx.user_email || '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">
                        {tx.donor_name || '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">
                        {tx.product_name || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getStatusBadge(tx.status)}
                          {tx.is_manual_approval && (
                            <span title="Aprovação manual"><UserCheck className="h-3 w-3 text-yellow-500" /></span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getAcquirerBadge(tx.acquirer)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isPaginating}
                >
                  {isPaginating && currentPage > 1 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentPage} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || isPaginating}
                >
                  {isPaginating && currentPage < totalPages ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Verify Transaction Dialog */}
    <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalhes da Transação
          </DialogTitle>
          <DialogDescription>
            Verifique os detalhes e tome uma ação se necessário.
          </DialogDescription>
        </DialogHeader>

        {selectedTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">TXID</p>
                <p className="font-mono text-xs break-all">{selectedTransaction.txid}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <div className="flex items-center gap-1">
                  {getStatusBadge(selectedTransaction.status)}
                  {selectedTransaction.is_manual_approval && (
                    <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/30">
                      Manual
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-semibold text-green-500">{formatCurrency(selectedTransaction.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p>{selectedTransaction.donor_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Usuário</p>
                <p className="text-xs truncate">{selectedTransaction.user_email || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Adquirente</p>
                {getAcquirerBadge(selectedTransaction.acquirer)}
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="text-xs">{formatDate(selectedTransaction.created_at)}</p>
              </div>
              {selectedTransaction.paid_at && (
                <div>
                  <p className="text-muted-foreground">Pago em</p>
                  <p className="text-xs">{formatDate(selectedTransaction.paid_at)}</p>
                </div>
              )}
              {selectedTransaction.is_manual_approval && selectedTransaction.approved_by_email && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Aprovado por</p>
                  <p className="text-xs text-yellow-500">{selectedTransaction.approved_by_email}</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              {selectedTransaction.status === 'generated' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCheckAcquirerStatus}
                    disabled={isVerifying}
                    className="flex-1"
                  >
                    {isVerifying ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Verificar na Adquirente
                  </Button>
                  <Button
                    onClick={handleMarkAsPaid}
                    disabled={isMarkingPaid}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isMarkingPaid ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Marcar como Pago
                  </Button>
                </>
              )}
              {selectedTransaction.status === 'paid' && selectedTransaction.is_manual_approval && (
                <Button
                  variant="destructive"
                  onClick={handleRevertApproval}
                  disabled={isReverting}
                  className="flex-1"
                >
                  {isReverting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Undo2 className="h-4 w-4 mr-1" />
                  )}
                  Reverter Aprovação Manual
                </Button>
              )}
              {selectedTransaction.status === 'paid' && !selectedTransaction.is_manual_approval && (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  <span>Pagamento confirmado pela adquirente</span>
                </div>
              )}
              {selectedTransaction.status === 'expired' && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span>Transação expirada</span>
                </div>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Transaction Details Sheet */}
    {sheetTransaction && (
      <TransactionDetailsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        transaction={sheetTransaction}
        calculateNetAmount={calculateNetAmount}
        isAdmin={true}
      />
    )}
    </>
  );
};
