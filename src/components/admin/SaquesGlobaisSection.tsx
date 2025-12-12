import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Check, X, RefreshCw, AlertTriangle, Copy, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingWithdrawal {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  bank_code: string;
  bank_name: string;
  pix_key_type: string;
  pix_key: string;
  created_at: string;
}

export function SaquesGlobaisSection() {
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<PendingWithdrawal | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  const loadWithdrawals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_withdrawals');
      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os saques pendentes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const sendNotificationEmail = async (withdrawal: PendingWithdrawal, status: 'approved' | 'rejected', rejectionReason?: string) => {
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
      // Don't throw - email is secondary to the withdrawal action
    }
  };

  const handleApprove = async (withdrawal: PendingWithdrawal) => {
    setProcessingId(withdrawal.id);
    try {
      const { error } = await supabase.rpc('process_withdrawal', {
        p_withdrawal_id: withdrawal.id,
        p_status: 'approved'
      });

      if (error) throw error;

      // Send notification email
      await sendNotificationEmail(withdrawal, 'approved');

      toast({
        title: "Saque aprovado!",
        description: `Saque de ${formatCurrency(withdrawal.amount)} aprovado com sucesso.`,
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

      // Send notification email
      await sendNotificationEmail(selectedWithdrawal, 'rejected', rejectionReason || undefined);

      toast({
        title: "Saque rejeitado",
        description: `Saque de ${formatCurrency(selectedWithdrawal.amount)} foi rejeitado.`,
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
      description: "Chave PIX copiada para a área de transferência.",
    });
  };

  const getPixTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'cpf': 'CPF',
      'cnpj': 'CNPJ',
      'email': 'E-mail',
      'phone': 'Telefone',
      'random': 'Aleatória'
    };
    return labels[type] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Saques Pendentes
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadWithdrawals}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {withdrawals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum saque pendente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">
                      {withdrawal.user_email}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary">
                        {formatCurrency(withdrawal.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {withdrawal.bank_code} - {withdrawal.bank_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getPixTypeLabel(withdrawal.pix_key_type)}
                        </Badge>
                        <span className="text-sm truncate max-w-[150px]">
                          {withdrawal.pix_key}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(withdrawal.pix_key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(withdrawal.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove(withdrawal)}
                          disabled={processingId === withdrawal.id}
                        >
                          <Check className="h-4 w-4" />
                          Aprovar
                        </Button>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

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
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setSelectedWithdrawal(null);
                  setRejectionReason("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingId !== null}
              >
                Confirmar Rejeição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
