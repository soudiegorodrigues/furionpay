import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, CheckCircle, XCircle, AlertCircle, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RecoverResult {
  transactionId: string;
  status: 'imported' | 'already_exists' | 'not_found' | 'error';
  message: string;
  data?: {
    id?: string;
    amount?: number;
    donor_name?: string;
    status?: string;
  };
}

interface RecoverSalesSectionProps {
  targetUserId: string;
  onRecoveryComplete?: () => void;
}

export const RecoverSalesSection = ({ targetUserId, onRecoveryComplete }: RecoverSalesSectionProps) => {
  const [transactionIds, setTransactionIds] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RecoverResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    imported: number;
    already_exists: number;
    not_found: number;
    errors: number;
  } | null>(null);

  const handleRecover = async () => {
    const ids = transactionIds
      .split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (ids.length === 0) {
      toast({
        title: "Erro",
        description: "Insira pelo menos um ID de transação",
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

      const { data, error } = await supabase.functions.invoke('recover-sales-ativus', {
        body: {
          targetUserId,
          transactionIds: ids
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
          title: "Vendas recuperadas",
          description: `${data.summary.imported} transação(ões) importada(s) com sucesso`
        });
        onRecoveryComplete?.();
      } else {
        toast({
          title: "Nenhuma nova venda",
          description: "Nenhuma transação nova foi importada"
        });
      }
    } catch (error: any) {
      console.error('Recovery error:', error);
      toast({
        title: "Erro ao recuperar vendas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: RecoverResult['status']) => {
    switch (status) {
      case 'imported':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'already_exists':
        return <FileWarning className="h-4 w-4 text-yellow-500" />;
      case 'not_found':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: RecoverResult['status']) => {
    switch (status) {
      case 'imported':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Importado</Badge>;
      case 'already_exists':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Já existe</Badge>;
      case 'not_found':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Não encontrado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Recuperar Vendas Não Registradas
        </CardTitle>
        <CardDescription>
          Importe transações da Ativus que não foram registradas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">IDs das Transações (um por linha)</label>
          <Textarea
            placeholder="Cole os IDs das transações aqui, um por linha...
Exemplo:
TX123456789
TX987654321"
            value={transactionIds}
            onChange={(e) => setTransactionIds(e.target.value)}
            rows={5}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use o ID da transação (txid) retornado pela Ativus na geração do PIX
          </p>
        </div>

        <Button 
          onClick={handleRecover} 
          disabled={isLoading || !transactionIds.trim()}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Recuperando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Recuperar Vendas
            </>
          )}
        </Button>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-4 bg-muted/50 rounded-lg">
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
              <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate">{result.transactionId}</p>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                  {result.data?.amount && (
                    <p className="text-xs text-green-600">
                      R$ {result.data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {result.data.donor_name}
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
