import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, FileWarning, Calendar, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ReconcileResult {
  transactionId: string;
  status: 'imported' | 'already_exists' | 'skipped' | 'error';
  message: string;
  data?: {
    id?: string;
    amount?: number;
    donor_name?: string;
    status?: string;
  };
}

interface ReconcileSalesSectionProps {
  targetUserId: string;
  onReconcileComplete?: () => void;
}

export const ReconcileSalesSection = ({ targetUserId, onReconcileComplete }: ReconcileSalesSectionProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactionIds, setTransactionIds] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ReconcileResult[]>([]);
  const [listEndpointAvailable, setListEndpointAvailable] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<{
    total: number;
    imported: number;
    already_exists: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const handleReconcile = async () => {
    const ids = transactionIds
      .split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    const hasPeriod = startDate && endDate;
    const hasIds = ids.length > 0;

    if (!hasPeriod && !hasIds) {
      toast({
        title: "Erro",
        description: "Informe um período (data início e fim) ou IDs de transação",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    setSummary(null);
    setListEndpointAvailable(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('reconcile-sales-ativus', {
        body: {
          targetUserId,
          startDate: hasPeriod ? startDate : undefined,
          endDate: hasPeriod ? endDate : undefined,
          transactionIds: hasIds ? ids : undefined
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
      setListEndpointAvailable(data.listEndpointAvailable ?? null);

      if (data.summary?.imported > 0) {
        toast({
          title: "Reconciliação concluída",
          description: `${data.summary.imported} transação(ões) importada(s) com sucesso`
        });
        onReconcileComplete?.();
      } else if (data.results?.length === 0) {
        toast({
          title: "Nenhuma transação",
          description: data.message || "Nenhuma transação encontrada para o período"
        });
      } else {
        toast({
          title: "Nenhuma nova venda",
          description: "Todas as transações já existem no sistema"
        });
      }
    } catch (error: any) {
      console.error('Reconcile error:', error);
      toast({
        title: "Erro na reconciliação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setTodayPeriod = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setYesterdayPeriod = () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    setStartDate(yesterday);
    setEndDate(yesterday);
  };

  const setLast7Days = () => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    setStartDate(weekAgo);
    setEndDate(today);
  };

  const getStatusIcon = (status: ReconcileResult['status']) => {
    switch (status) {
      case 'imported':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'already_exists':
        return <FileWarning className="h-4 w-4 text-yellow-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
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
          <RefreshCw className="h-5 w-5 text-primary" />
          Reconciliação por Período
        </CardTitle>
        <CardDescription>
          Busque transações na Ativus por período e importe as que não estão registradas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period selection */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={setTodayPeriod}>
              <Calendar className="h-3 w-3 mr-1" />
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={setYesterdayPeriod}>
              Ontem
            </Button>
            <Button variant="outline" size="sm" onClick={setLast7Days}>
              Últimos 7 dias
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Data Início</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Data Fim</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Optional: Transaction IDs */}
        <div className="space-y-2">
          <label className="text-sm font-medium">IDs de Transação (opcional)</label>
          <Textarea
            placeholder="Opcional: Cole IDs específicos para buscar, um por linha..."
            value={transactionIds}
            onChange={(e) => setTransactionIds(e.target.value)}
            rows={3}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Se informados, esses IDs serão buscados além do período selecionado
          </p>
        </div>

        <Button 
          onClick={handleReconcile} 
          disabled={isLoading || (!startDate && !endDate && !transactionIds.trim())}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Reconciliando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Iniciar Reconciliação
            </>
          )}
        </Button>

        {/* API status warning */}
        {listEndpointAvailable === false && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-600">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              O endpoint de listagem por período não está disponível na API da Ativus. 
              Use os IDs de transação para importar manualmente.
            </p>
          </div>
        )}

        {/* Summary */}
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
              <p className="text-2xl font-bold text-muted-foreground">{summary.skipped}</p>
              <p className="text-xs text-muted-foreground">Ignorados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
          </div>
        )}

        {/* Results list */}
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
