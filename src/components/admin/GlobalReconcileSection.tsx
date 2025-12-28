import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle, XCircle, AlertCircle, FileWarning, Wand2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ReconcileResult {
  transactionId: string;
  status: 'imported' | 'already_exists' | 'not_found' | 'error' | 'user_not_found' | 'skipped';
  message: string;
  data?: {
    id?: string;
    amount?: number;
    donor_name?: string;
    status?: string;
    matched_user_email?: string;
    matched_user_name?: string;
    matched_user_id?: string;
  };
}

interface GlobalReconcileSectionProps {
  onReconcileComplete?: () => void;
}

export const GlobalReconcileSection = ({ onReconcileComplete }: GlobalReconcileSectionProps) => {
  const [transactionIds, setTransactionIds] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ReconcileResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    imported: number;
    already_exists: number;
    not_found: number;
    user_not_found: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const handleReconcile = async () => {
    const ids = transactionIds
      .split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (ids.length === 0) {
      toast({
        title: "Erro",
        description: "Cole pelo menos um código de transação",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('reconcile-sales-ativus', {
        body: {
          transactionIds: ids,
          autoIdentify: true
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResults(data.results || []);
      setSummary(data.summary || null);

      if (data.summary?.imported > 0) {
        toast({
          title: "Recuperação concluída",
          description: `${data.summary.imported} venda(s) importada(s) com sucesso`
        });
        onReconcileComplete?.();
      } else if (data.results?.length === 0) {
        toast({
          title: "Nenhuma transação",
          description: "Nenhuma transação encontrada na Ativus"
        });
      } else {
        toast({
          title: "Nenhuma nova venda",
          description: "Todas as transações já existem ou não foram encontradas"
        });
      }
    } catch (error: any) {
      console.error('Reconcile error:', error);
      toast({
        title: "Erro na recuperação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: ReconcileResult['status']) => {
    switch (status) {
      case 'imported':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'already_exists':
        return <FileWarning className="h-4 w-4 text-yellow-500" />;
      case 'not_found':
      case 'user_not_found':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ReconcileResult['status']) => {
    switch (status) {
      case 'imported':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Importado</Badge>;
      case 'already_exists':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Já existe</Badge>;
      case 'not_found':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Não encontrado</Badge>;
      case 'user_not_found':
        return <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">Usuário não identificado</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Ignorado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Recuperação Automática de Vendas
        </CardTitle>
        <CardDescription>
          Cole o código da transação e o sistema identifica automaticamente o usuário
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transaction IDs */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Código da Transação</label>
          <Textarea
            placeholder="Cole o código aqui (um por linha)

Exemplos aceitos:
• ID Ativus: a4f32c009dd0454088d2e29dd6...
• TXID FurionPay: 3efa0893cfa447568cb50ab824"
            value={transactionIds}
            onChange={(e) => setTransactionIds(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Aceita tanto o código da Ativus quanto o TXID do FurionPay
          </p>
        </div>

        <Button 
          onClick={handleReconcile} 
          disabled={isLoading || !transactionIds.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Buscando e Importando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Recuperar Vendas
            </>
          )}
        </Button>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{summary.imported}</p>
              <p className="text-xs text-muted-foreground">Importados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{summary.already_exists}</p>
              <p className="text-xs text-muted-foreground">Já existiam</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{summary.not_found}</p>
              <p className="text-xs text-muted-foreground">Não encontrados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{summary.user_not_found}</p>
              <p className="text-xs text-muted-foreground">Sem usuário</p>
            </div>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {results.map((result, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs truncate">{result.transactionId}</p>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                  {result.data?.amount && (
                    <p className="text-xs text-green-600">
                      R$ {result.data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {result.data.donor_name}
                    </p>
                  )}
                  {result.data?.matched_user_email && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {result.data.matched_user_name || result.data.matched_user_email}
                    </p>
                  )}
                </div>
                {getStatusBadge(result.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
