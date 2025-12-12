import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Clock, RefreshCw, Construction } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  product_name: string | null;
  donor_name: string | null;
}

type DateFilter = 'today' | '7days' | '15days' | 'month' | 'year' | 'all';

const AdminFinanceiro = () => {
  const { user, isAdmin } = useAdminAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_user_transactions', {
        p_limit: 1000
      });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    const interval = setInterval(() => loadTransactions(), 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const brazilNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    let startDate: Date | null = null;
    
    switch (dateFilter) {
      case 'today':
        startDate = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate());
        break;
      case '7days':
        startDate = new Date(brazilNow);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '15days':
        startDate = new Date(brazilNow);
        startDate.setDate(startDate.getDate() - 15);
        break;
      case 'month':
        startDate = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(brazilNow.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        return transactions;
    }
    
    return transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate >= startDate!;
    });
  }, [transactions, dateFilter]);

  const stats = useMemo(() => {
    const paid = filteredTransactions.filter(tx => tx.status === 'paid');
    const pending = filteredTransactions.filter(tx => tx.status === 'generated');
    
    const totalReceived = paid.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPending = pending.reduce((sum, tx) => sum + tx.amount, 0);
    const totalGenerated = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    const conversionRate = filteredTransactions.length > 0 
      ? (paid.length / filteredTransactions.length) * 100 
      : 0;

    return {
      totalReceived,
      totalPending,
      totalGenerated,
      paidCount: paid.length,
      pendingCount: pending.length,
      totalCount: filteredTransactions.length,
      conversionRate
    };
  }, [filteredTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const dateFilterOptions = [
    { value: 'today', label: 'Hoje' },
    { value: '7days', label: '7 Dias' },
    { value: '15days', label: '15 Dias' },
    { value: 'month', label: 'Este Mês' },
    { value: 'year', label: 'Este Ano' },
    { value: 'all', label: 'Todo Período' },
  ];

  // Show "Em Produção" for non-admin users
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Página em Produção</h2>
            <p className="text-muted-foreground">
              Estamos trabalhando para trazer a melhor experiência de gerenciamento financeiro para você.
            </p>
            <Badge variant="outline" className="text-sm">
              Em breve
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Painel Financeiro</h1>
            <p className="text-sm text-muted-foreground">Acompanhe suas finanças em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadTransactions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.totalReceived)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.paidCount} transações pagas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(stats.totalPending)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingCount} aguardando pagamento
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Total Gerado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(stats.totalGenerated)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCount} transações no período
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {stats.conversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.paidCount} de {stats.totalCount} convertidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Resumo do Saldo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Saldo Disponível</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.totalReceived)}
              </p>
              <p className="text-xs text-muted-foreground">
                Valor já confirmado e disponível
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">A Receber</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(stats.totalPending)}
              </p>
              <p className="text-xs text-muted-foreground">
                Aguardando confirmação de pagamento
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Projeção Total</p>
              <p className="text-3xl font-bold">
                {formatCurrency(stats.totalReceived + stats.totalPending)}
              </p>
              <p className="text-xs text-muted-foreground">
                Saldo disponível + a receber
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default AdminFinanceiro;
