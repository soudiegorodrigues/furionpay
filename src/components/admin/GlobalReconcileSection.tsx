import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, CheckCircle, XCircle, AlertCircle, FileWarning, UserSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ReconcileResult {
  transactionId: string;
  status: 'imported' | 'already_exists' | 'not_found' | 'error' | 'user_not_found';
  message: string;
  data?: {
    id?: string;
    amount?: number;
    donor_name?: string;
    status?: string;
    matched_user_email?: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface GlobalReconcileSectionProps {
  onReconcileComplete?: () => void;
}

export const GlobalReconcileSection = ({ onReconcileComplete }: GlobalReconcileSectionProps) => {
  const [transactionIds, setTransactionIds] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ReconcileResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    imported: number;
    already_exists: number;
    not_found: number;
    errors: number;
  } | null>(null);

  const loadUsers = async () => {
    if (users.length > 0) return;
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_auth');
      if (error) throw error;
      setUsers((data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name
      })));
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleReconcile = async () => {
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

    if (!selectedUserId) {
      toast({
        title: "Erro",
        description: "Selecione o usuário dono das transações",
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
          targetUserId: selectedUserId,
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
          title: "Reconciliação concluída",
          description: `${data.summary.imported} transação(ões) importada(s) com sucesso`
        });
        onReconcileComplete?.();
      } else if (data.results?.length === 0) {
        toast({
          title: "Nenhuma transação",
          description: "Nenhuma transação encontrada"
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
        title: "Erro na reconciliação",
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
        return <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">Usuário não encontrado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserSearch className="h-5 w-5 text-primary" />
          Recuperação Global de Vendas
        </CardTitle>
        <CardDescription>
          Recupere transações da Ativus quando não souber de qual usuário é a venda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Selecione o Usuário (dono da venda)</label>
          <Select 
            value={selectedUserId} 
            onValueChange={setSelectedUserId}
            onOpenChange={(open) => open && loadUsers()}
          >
            <SelectTrigger>
              <SelectValue placeholder="Clique para selecionar o usuário..." />
            </SelectTrigger>
            <SelectContent>
              {isLoadingUsers ? (
                <div className="p-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              ) : (
                users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email.split('@')[0]} - {user.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedUser && (
            <p className="text-xs text-muted-foreground">
              Selecionado: <strong>{selectedUser.email}</strong>
            </p>
          )}
        </div>

        {/* Transaction IDs */}
        <div className="space-y-2">
          <label className="text-sm font-medium">IDs das Transações (um por linha)</label>
          <Textarea
            placeholder="Cole os IDs das transações aqui, um por linha...
Exemplo:
a4f32c009dd0454088d2e29dd6
TX987654321"
            value={transactionIds}
            onChange={(e) => setTransactionIds(e.target.value)}
            rows={5}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use o ID da transação (txid) retornado pela Ativus
          </p>
        </div>

        <Button 
          onClick={handleReconcile} 
          disabled={isLoading || !transactionIds.trim() || !selectedUserId}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Recuperando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Buscar e Importar
            </>
          )}
        </Button>

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
              <p className="text-2xl font-bold text-red-600">{summary.not_found}</p>
              <p className="text-xs text-muted-foreground">Não encontrados</p>
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
