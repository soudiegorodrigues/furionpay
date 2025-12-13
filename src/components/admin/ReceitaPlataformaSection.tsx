import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { TrendingUp, Loader2, RefreshCw, Wallet, Receipt, DollarSign, Calculator, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired';
  created_at: string;
  paid_at: string | null;
  fee_percentage: number | null;
  fee_fixed: number | null;
  user_email: string | null;
}

interface ChartData {
  date: string;
  lucro: number;
}

type ChartFilter = 'today' | '7days' | '14days' | '30days';

const chartFilterOptions: { value: ChartFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: '14days', label: '14 dias' },
  { value: '30days', label: '30 dias' },
];

// Helper para calcular lucro de uma transação
const calculateProfit = (amount: number, feePercentage: number | null, feeFixed: number | null): number => {
  const percentage = feePercentage ?? 0;
  const fixed = feeFixed ?? 0;
  return (amount * percentage / 100) + fixed;
};

// Helper para obter data/hora no timezone de São Paulo
const getBrazilDateStr = (date: Date): string => {
  return date.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
};

const getBrazilHour = (date: Date): number => {
  return parseInt(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
};

export const ReceitaPlataformaSection = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chartFilter, setChartFilter] = useState<ChartFilter>('today');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pix_transactions_auth', { p_limit: 0 });
      if (error) throw error;
      setTransactions(data as unknown as Transaction[] || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Extrair lista única de usuários
  const uniqueUsers = useMemo(() => {
    const usersSet = new Set<string>();
    transactions.forEach(tx => {
      if (tx.user_email) {
        usersSet.add(tx.user_email);
      }
    });
    return Array.from(usersSet).sort();
  }, [transactions]);

  // Filtrar transações pagas e por usuário selecionado
  const paidTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const isPaid = tx.status === 'paid';
      const matchesUser = selectedUser === 'all' || tx.user_email === selectedUser;
      return isPaid && matchesUser;
    });
  }, [transactions, selectedUser]);

  // Calcular lucros por período
  const profitStats = useMemo(() => {
    const now = new Date();
    const todayStr = getBrazilDateStr(now);
    
    // Calcular datas de referência
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    let todayProfit = 0;
    let sevenDaysProfit = 0;
    let fifteenDaysProfit = 0;
    let thisMonthProfit = 0;
    let thisYearProfit = 0;
    let totalProfit = 0;

    paidTransactions.forEach(tx => {
      const profit = calculateProfit(tx.amount, tx.fee_percentage, tx.fee_fixed);
      totalProfit += profit;

      const txDate = tx.paid_at ? new Date(tx.paid_at) : new Date(tx.created_at);
      const txDateStr = getBrazilDateStr(txDate);

      // Hoje
      if (txDateStr === todayStr) {
        todayProfit += profit;
      }

      // 7 dias
      if (txDate >= sevenDaysAgo) {
        sevenDaysProfit += profit;
      }

      // 15 dias
      if (txDate >= fifteenDaysAgo) {
        fifteenDaysProfit += profit;
      }

      // Este mês
      if (txDate >= thisMonthStart) {
        thisMonthProfit += profit;
      }

      // Este ano
      if (txDate >= thisYearStart) {
        thisYearProfit += profit;
      }
    });

    return {
      today: todayProfit,
      sevenDays: sevenDaysProfit,
      fifteenDays: fifteenDaysProfit,
      thisMonth: thisMonthProfit,
      thisYear: thisYearProfit,
      total: totalProfit,
      transactionCount: paidTransactions.length,
      averageProfit: paidTransactions.length > 0 ? totalProfit / paidTransactions.length : 0
    };
  }, [paidTransactions]);

  // Dados do gráfico
  const chartData = useMemo((): ChartData[] => {
    const data: ChartData[] = [];
    const now = new Date();
    
    if (chartFilter === 'today') {
      const todayStr = getBrazilDateStr(now);
      
      for (let hour = 0; hour < 24; hour++) {
        const displayHour = `${hour.toString().padStart(2, '0')}:00`;
        
        const hourTransactions = paidTransactions.filter(tx => {
          const txDate = tx.paid_at ? new Date(tx.paid_at) : new Date(tx.created_at);
          const txDateStr = getBrazilDateStr(txDate);
          const txHour = getBrazilHour(txDate);
          return txDateStr === todayStr && txHour === hour;
        });
        
        const lucro = hourTransactions.reduce((sum, tx) => 
          sum + calculateProfit(tx.amount, tx.fee_percentage, tx.fee_fixed), 0
        );
        
        data.push({ date: displayHour, lucro });
      }
      
      return data;
    }
    
    // Para outros filtros, mostrar dados diários
    const days = chartFilter === '7days' ? 7 : chartFilter === '14days' ? 14 : 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      const dayTransactions = paidTransactions.filter(tx => {
        const txDate = tx.paid_at ? new Date(tx.paid_at) : new Date(tx.created_at);
        return txDate.toISOString().split('T')[0] === dateStr;
      });
      
      const lucro = dayTransactions.reduce((sum, tx) => 
        sum + calculateProfit(tx.amount, tx.fee_percentage, tx.fee_fixed), 0
      );
      
      data.push({ date: displayDate, lucro });
    }
    
    return data;
  }, [paidTransactions, chartFilter]);

  return (
    <>
      {/* Cards de Lucro por Período */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Receita da Plataforma
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Filtro por usuário */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[180px] sm:w-[220px] h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Filtrar por usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {uniqueUsers.map(email => (
                    <SelectItem key={email} value={email}>
                      {email.length > 25 ? `${email.slice(0, 25)}...` : email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadTransactions} 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {selectedUser !== 'all' && (
                <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Filtrando por: <span className="font-medium text-foreground">{selectedUser}</span>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-primary/10 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-primary">
                    {formatCurrency(profitStats.today)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Hoje</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">
                    {formatCurrency(profitStats.sevenDays)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">7 Dias</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">
                    {formatCurrency(profitStats.fifteenDays)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">15 Dias</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">
                    {formatCurrency(profitStats.thisMonth)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Este Mês</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-green-500/10 rounded-lg col-span-2 sm:col-span-1">
                  <div className="text-lg sm:text-2xl font-bold text-green-500">
                    {formatCurrency(profitStats.thisYear)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Este Ano</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Evolução do Lucro */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-sm sm:text-lg">Evolução do Lucro</CardTitle>
            </div>
            
            <div className="flex items-center bg-muted rounded-full p-1">
              {chartFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setChartFilter(option.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                    chartFilter === option.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] sm:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 30, right: 10, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="barGradientProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  className="stroke-muted" 
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  interval={chartFilter === 'today' ? 0 : 'preserveStartEnd'}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '6px' }}
                  formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                />
                <Bar 
                  dataKey="lucro" 
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                  fill="url(#barGradientProfit)"
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  <LabelList 
                    dataKey="lucro"
                    position="top"
                    fill="hsl(142, 76%, 36%)"
                    fontSize={10}
                    fontWeight={600}
                    offset={8}
                    formatter={(value: number) => value > 0 ? `R$${value.toFixed(0)}` : ''}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-xs text-muted-foreground font-medium">Lucro (Taxas cobradas)</span>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Estatísticas Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Receipt className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profitStats.transactionCount}</p>
                <p className="text-sm text-muted-foreground">Transações Pagas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="p-3 bg-green-500/10 rounded-full">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(profitStats.total)}</p>
                <p className="text-sm text-muted-foreground">Lucro Acumulado</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="p-3 bg-primary/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(profitStats.averageProfit)}</p>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
