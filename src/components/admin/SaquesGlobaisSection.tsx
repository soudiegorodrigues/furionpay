import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, RefreshCw, AlertTriangle, Copy, Search, ChevronLeft, ChevronRight, FileText, DollarSign, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Withdrawal {
  id: string;
  user_id: string;
  user_email: string;
  amount: number; // valor líquido (NET) que o usuário recebe
  gross_amount: number | null; // valor bruto (GROSS) que é descontado do saldo
  fee_percentage: number | null;
  fee_fixed: number | null;
  bank_code: string;
  bank_name: string;
  pix_key_type: string;
  pix_key: string;
  created_at: string;
  status: string;
  processed_at?: string;
  rejection_reason?: string;
}

// Helper para obter o valor bruto do saque (usado para validação de saldo)
const getWithdrawalGrossAmount = (withdrawal: Withdrawal): number => {
  // Se gross_amount está disponível, usa ele; caso contrário, assume amount como bruto (legado)
  return withdrawal.gross_amount ?? withdrawal.amount;
};

interface UserBalance {
  user_id: string;
  balance: number;
  loading: boolean;
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

export function SaquesGlobaisSection() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [userBalances, setUserBalances] = useState<Record<string, UserBalance>>({});
  const itemsPerPage = 10;
  const { toast } = useToast();

  const loadWithdrawals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_withdrawals_admin', {
        p_limit: 500
      });
      if (error) throw error;
      setWithdrawals(data || []);
      
      // Carregar saldos dos usuários com saques pendentes
      const pendingWithdrawals = (data || []).filter((w: Withdrawal) => w.status === 'pending');
      const uniqueUserIds = [...new Set(pendingWithdrawals.map((w: Withdrawal) => w.user_id))];
      
      for (const userId of uniqueUserIds) {
        loadUserBalance(userId as string);
      }
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os saques.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserBalance = async (userId: string) => {
    setUserBalances(prev => ({
      ...prev,
      [userId]: { user_id: userId, balance: 0, loading: true }
    }));
    
    try {
      const { data, error } = await supabase.rpc('get_user_balance_for_admin', {
        p_user_id: userId
      });
      
      if (error) throw error;
      
      setUserBalances(prev => ({
        ...prev,
        [userId]: { user_id: userId, balance: data || 0, loading: false }
      }));
    } catch (error) {
      console.error('Error loading user balance:', error);
      setUserBalances(prev => ({
        ...prev,
        [userId]: { user_id: userId, balance: 0, loading: false }
      }));
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const filteredWithdrawals = useMemo(() => {
    let filtered = withdrawals;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(w => 
        w.user_email.toLowerCase().includes(search) || 
        w.id.toLowerCase().includes(search) || 
        w.pix_key.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [withdrawals, statusFilter, searchTerm]);

  const paginatedWithdrawals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWithdrawals.slice(start, start + itemsPerPage);
  }, [filteredWithdrawals, currentPage]);

  const totalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);

  const stats = useMemo(() => {
    const pending = withdrawals.filter(w => w.status === 'pending');
    const approved = withdrawals.filter(w => w.status === 'approved');
    return {
      totalPending: pending.length,
      pendingValue: pending.reduce((acc, w) => acc + w.amount, 0),
      totalApproved: approved.length,
      approvedValue: approved.reduce((acc, w) => acc + w.amount, 0)
    };
  }, [withdrawals]);

  const sendNotificationEmail = async (withdrawal: Withdrawal, status: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      await supabase.functions.invoke('send-withdrawal-notification', {
        body: {
          userEmail: withdrawal.user_email,
          amount: withdrawal.amount,
          status,
          bankName: `${withdrawal.bank_code} - ${withdrawal.bank_name}`,
          pixKey: withdrawal.pix_key,
          rejectionReason
        }
      });
    } catch (error) {
      console.error('Error sending notification email:', error);
    }
  };

  // Calcula se o saque pode ser aprovado
  // Importante: userBalance retorna o saldo APÓS reservar TODOS os pendentes.
  // Para validar este saque específico, precisamos adicionar o gross_amount dele de volta.
  const canApproveWithdrawal = (withdrawal: Withdrawal): boolean => {
    const userBalance = userBalances[withdrawal.user_id];
    if (!userBalance || userBalance.loading) return true; // Assume OK se ainda carregando
    
    const grossAmount = getWithdrawalGrossAmount(withdrawal);
    // Saldo para aprovar ESTE saque = saldo restante + gross_amount deste saque
    // Porque o saldo restante já subtraiu este saque pendente
    const balanceToApproveThis = userBalance.balance + grossAmount;
    
    return balanceToApproveThis >= grossAmount;
  };

  const hasInsufficientBalance = (withdrawal: Withdrawal): boolean => {
    return !canApproveWithdrawal(withdrawal);
  };
  
  // Calcula o saldo disponível para aprovar este saque específico
  const getBalanceForApproval = (withdrawal: Withdrawal): number => {
    const userBalance = userBalances[withdrawal.user_id];
    if (!userBalance || userBalance.loading) return 0;
    
    const grossAmount = getWithdrawalGrossAmount(withdrawal);
    // Saldo para aprovar = saldo atual + gross deste saque (porque já foi subtraído)
    return userBalance.balance + grossAmount;
  };

  const handleApprove = async (withdrawal: Withdrawal) => {
    // Validação de saldo no frontend (segurança em dupla camada)
    if (!canApproveWithdrawal(withdrawal)) {
      const grossAmount = getWithdrawalGrossAmount(withdrawal);
      const balanceForApproval = getBalanceForApproval(withdrawal);
      toast({
        title: "Saldo Insuficiente",
        description: `O usuário não possui saldo suficiente. Saldo disponível: ${formatCurrency(balanceForApproval)}, Valor bruto do saque: ${formatCurrency(grossAmount)}`,
        variant: "destructive"
      });
      return;
    }

    setProcessingId(withdrawal.id);
    try {
      const { error } = await supabase.rpc('process_withdrawal', {
        p_withdrawal_id: withdrawal.id,
        p_status: 'approved'
      });
      
      if (error) {
        // Trata erro de saldo insuficiente do banco de dados
        if (error.message.includes('Saldo insuficiente')) {
          toast({
            title: "Saldo Insuficiente",
            description: error.message,
            variant: "destructive"
          });
          // Recarregar saldo do usuário
          loadUserBalance(withdrawal.user_id);
          return;
        }
        throw error;
      }
      
      await sendNotificationEmail(withdrawal, 'approved');
      toast({
        title: "Saque aprovado!",
        description: `Saque de ${formatCurrency(withdrawal.amount)} aprovado com sucesso.`
      });
      loadWithdrawals();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar saque.",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;
    setProcessingId(selectedWithdrawal.id);
    try {
      const { error } = await supabase.rpc('process_withdrawal', {
        p_withdrawal_id: selectedWithdrawal.id,
        p_status: 'rejected',
        p_rejection_reason: rejectionReason || null
      });
      if (error) throw error;
      await sendNotificationEmail(selectedWithdrawal, 'rejected', rejectionReason || undefined);
      toast({
        title: "Saque rejeitado",
        description: `Saque de ${formatCurrency(selectedWithdrawal.amount)} foi rejeitado.`
      });
      setShowRejectDialog(false);
      setSelectedWithdrawal(null);
      setRejectionReason("");
      loadWithdrawals();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao rejeitar saque.",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Chave PIX copiada para a área de transferência."
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBalanceBadge = (withdrawal: Withdrawal) => {
    const userBalance = userBalances[withdrawal.user_id];
    
    if (!userBalance || userBalance.loading) {
      return (
        <span className="text-xs text-muted-foreground animate-pulse">
          Carregando...
        </span>
      );
    }

    const grossAmount = getWithdrawalGrossAmount(withdrawal);
    const balanceForApproval = getBalanceForApproval(withdrawal);
    const isInsufficient = !canApproveWithdrawal(withdrawal);
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
              isInsufficient 
                ? 'bg-red-500/10 text-red-600 border border-red-500/30' 
                : 'bg-green-500/10 text-green-600 border border-green-500/30'
            }`}>
              <Wallet className="h-3 w-3" />
              {formatCurrency(balanceForApproval)}
              {isInsufficient && <AlertTriangle className="h-3 w-3 ml-1" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isInsufficient 
              ? `Saldo insuficiente! Saldo: ${formatCurrency(balanceForApproval)}, Bruto: ${formatCurrency(grossAmount)}`
              : `Saldo ${formatCurrency(balanceForApproval)} suficiente para aprovar (bruto: ${formatCurrency(grossAmount)})`
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Main Card */}
      <Card>
        <CardContent className="p-6">
          {/* Title and Refresh */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-black">Controle de Saques</h3>
            <Button variant="outline" size="sm" onClick={loadWithdrawals} disabled={isLoading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black text-sm">Saques Pendentes</p>
                  <p className="text-lg font-bold">{stats.totalPending}</p>
                  <p className="text-[10px] text-muted-foreground">{formatCurrency(stats.pendingValue)}</p>
                </div>
                <FileText className="h-4 w-4 text-[#ef4343]" />
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-black">Saques Aprovados</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.approvedValue)}</p>
                  <p className="text-[10px] text-muted-foreground">{stats.totalApproved} saques processados</p>
                </div>
                <DollarSign className="h-4 w-4 text-[#ef4343]" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar saque..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="pl-9 w-[200px]" 
                />
              </div>
            </div>

            <Tabs value={statusFilter} onValueChange={v => {
              setStatusFilter(v as StatusFilter);
              setCurrentPage(1);
            }}>
              <TabsList className="bg-transparent border">
                <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Pendentes
                </TabsTrigger>
                <TabsTrigger value="approved" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Aprovados
                </TabsTrigger>
                <TabsTrigger value="rejected" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Rejeitados
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Email do Usuário</TableHead>
                  <TableHead className="font-semibold">Data de Solicitação</TableHead>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Valor do Saque</TableHead>
                  {statusFilter === 'pending' && <TableHead className="font-semibold">Saldo Disponível</TableHead>}
                  <TableHead className="font-semibold">Chave PIX</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  {statusFilter === 'pending' && <TableHead className="font-semibold text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={statusFilter === 'pending' ? 8 : 6} className="text-center py-12">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Search className="h-12 w-12 mb-4 opacity-30" />
                        <p>Nenhum saque encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedWithdrawals.map(withdrawal => (
                  <TableRow key={withdrawal.id} className={hasInsufficientBalance(withdrawal) ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                    <TableCell className="text-sm">
                      {withdrawal.user_email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(withdrawal.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {withdrawal.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col">
                              <span className="font-bold text-primary">
                                {formatCurrency(withdrawal.amount)}
                              </span>
                              {withdrawal.gross_amount && withdrawal.gross_amount !== withdrawal.amount && (
                                <span className="text-[10px] text-muted-foreground">
                                  Bruto: {formatCurrency(withdrawal.gross_amount)}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-1">
                              <p>Líquido (usuário recebe): {formatCurrency(withdrawal.amount)}</p>
                              <p>Bruto (desconta do saldo): {formatCurrency(getWithdrawalGrossAmount(withdrawal))}</p>
                              {withdrawal.fee_percentage !== null && (
                                <p className="text-muted-foreground">Taxa: {withdrawal.fee_percentage}% + {formatCurrency(withdrawal.fee_fixed ?? 0)}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    {statusFilter === 'pending' && (
                      <TableCell>
                        {getBalanceBadge(withdrawal)}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-muted-foreground">{withdrawal.pix_key_type}</span>
                          <span className="text-sm font-mono truncate max-w-[150px]" title={withdrawal.pix_key}>
                            {withdrawal.pix_key}
                          </span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(withdrawal.pix_key)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(withdrawal.status)}
                    </TableCell>
                    {statusFilter === 'pending' && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className={`gap-1 ${
                                      hasInsufficientBalance(withdrawal)
                                        ? 'text-muted-foreground cursor-not-allowed opacity-50'
                                        : 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950'
                                    }`}
                                    onClick={() => handleApprove(withdrawal)} 
                                    disabled={processingId === withdrawal.id || hasInsufficientBalance(withdrawal)}
                                  >
                                    <Check className="h-4 w-4" />
                                    Aprovar
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              {hasInsufficientBalance(withdrawal) && (
                                <TooltipContent>
                                  <p>Saldo insuficiente para aprovar este saque</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" 
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setShowRejectDialog(true);
                            }} 
                            disabled={processingId === withdrawal.id}
                          >
                            <X className="h-4 w-4" />
                            Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Exibindo {filteredWithdrawals.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredWithdrawals.length)} de {filteredWithdrawals.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                {currentPage} / {totalPages || 1}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Rejeitar Saque
            </DialogTitle>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Usuário:</span>{" "}
                  <span className="font-medium">{selectedWithdrawal.user_email}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Valor:</span>{" "}
                  <span className="font-bold text-primary">
                    {formatCurrency(selectedWithdrawal.amount)}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Motivo da rejeição (opcional)</Label>
                <Textarea 
                  placeholder="Explique o motivo da rejeição..." 
                  value={rejectionReason} 
                  onChange={e => setRejectionReason(e.target.value)} 
                  rows={3} 
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setSelectedWithdrawal(null);
              setRejectionReason("");
            }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processingId !== null}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
