import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Loader2, RefreshCw, Wallet, Receipt, DollarSign, Calculator, Users, Target, ArrowUpRight, ArrowDownRight, Trophy, PieChartIcon, GitCompare, Goal, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
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

interface UserProfitRanking {
  email: string;
  totalProfit: number;
  transactionCount: number;
  averageProfit: number;
}

type ChartFilter = 'today' | '7days' | '14days' | '30days';
type RankingFilter = 'all' | 'today' | '7days' | '30days' | 'thisMonth';

const chartFilterOptions: { value: ChartFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: '14days', label: '14 dias' },
  { value: '30days', label: '30 dias' },
];

const rankingFilterOptions: { value: RankingFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
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
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>('all');
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [goalInput, setGoalInput] = useState<string>('');
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadMonthlyGoal();
  }, []);

  const loadMonthlyGoal = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_settings_auth');
      if (error) throw error;
      const goalSetting = data?.find((s: { key: string; value: string }) => s.key === 'monthly_profit_goal');
      if (goalSetting) {
        setMonthlyGoal(parseFloat(goalSetting.value) || 0);
      }
    } catch (error) {
      console.error('Error loading monthly goal:', error);
    }
  };

  const saveMonthlyGoal = async () => {
    const newGoal = parseFloat(goalInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'monthly_profit_goal',
        setting_value: newGoal.toString()
      });
      if (error) throw error;
      setMonthlyGoal(newGoal);
      setIsGoalDialogOpen(false);
      toast.success('Meta mensal atualizada com sucesso!');
    } catch (error) {
      console.error('Error saving monthly goal:', error);
      toast.error('Erro ao salvar meta mensal');
    }
  };

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
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    
    // Mês anterior
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    let todayProfit = 0;
    let sevenDaysProfit = 0;
    let fifteenDaysProfit = 0;
    let thirtyDaysProfit = 0;
    let thisMonthProfit = 0;
    let lastMonthProfit = 0;
    let thisYearProfit = 0;
    let totalProfit = 0;

    // Para calcular média diária dos últimos 7 dias
    const dailyProfits: Map<string, number> = new Map();

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
        // Acumular lucro diário para cálculo de média
        const existingProfit = dailyProfits.get(txDateStr) || 0;
        dailyProfits.set(txDateStr, existingProfit + profit);
      }

      // 15 dias
      if (txDate >= fifteenDaysAgo) {
        fifteenDaysProfit += profit;
      }

      // 30 dias
      if (txDate >= thirtyDaysAgo) {
        thirtyDaysProfit += profit;
      }

      // Este mês
      if (txDate >= thisMonthStart) {
        thisMonthProfit += profit;
      }

      // Mês anterior
      if (txDate >= lastMonthStart && txDate <= lastMonthEnd) {
        lastMonthProfit += profit;
      }

      // Este ano
      if (txDate >= thisYearStart) {
        thisYearProfit += profit;
      }
    });

    // Calcular média diária baseada nos últimos 7 dias
    const daysWithData = dailyProfits.size;
    const averageDailyProfit = daysWithData > 0 ? sevenDaysProfit / 7 : 0;
    
    // Projeção mensal = média diária × 30
    const monthlyProjection = averageDailyProfit * 30;
    
    // Calcular tendência (comparar primeira metade vs segunda metade dos últimos 7 dias)
    const sortedDays = Array.from(dailyProfits.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let firstHalfProfit = 0;
    let secondHalfProfit = 0;
    sortedDays.forEach((entry, index) => {
      if (index < sortedDays.length / 2) {
        firstHalfProfit += entry[1];
      } else {
        secondHalfProfit += entry[1];
      }
    });
    const trendPercentage = firstHalfProfit > 0 
      ? ((secondHalfProfit - firstHalfProfit) / firstHalfProfit) * 100 
      : 0;

    // Variação mês atual vs mês anterior
    const monthOverMonthChange = lastMonthProfit > 0 
      ? ((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100 
      : thisMonthProfit > 0 ? 100 : 0;

    return {
      today: todayProfit,
      sevenDays: sevenDaysProfit,
      fifteenDays: fifteenDaysProfit,
      thirtyDays: thirtyDaysProfit,
      thisMonth: thisMonthProfit,
      lastMonth: lastMonthProfit,
      monthOverMonthChange,
      thisYear: thisYearProfit,
      total: totalProfit,
      transactionCount: paidTransactions.length,
      averageProfit: paidTransactions.length > 0 ? totalProfit / paidTransactions.length : 0,
      averageDailyProfit,
      monthlyProjection,
      trendPercentage,
      daysWithData
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

  // Ranking de usuários por lucro gerado
  const userProfitRanking = useMemo((): UserProfitRanking[] => {
    const userStats: Map<string, { totalProfit: number; transactionCount: number }> = new Map();
    
    const now = new Date();
    const todayStr = getBrazilDateStr(now);
    
    // Calcular datas de referência para filtros
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Filtrar transações pagas por período
    const filteredTransactions = transactions.filter(tx => {
      if (tx.status !== 'paid') return false;
      
      if (rankingFilter === 'all') return true;
      
      const txDate = tx.paid_at ? new Date(tx.paid_at) : new Date(tx.created_at);
      const txDateStr = getBrazilDateStr(txDate);
      
      switch (rankingFilter) {
        case 'today':
          return txDateStr === todayStr;
        case '7days':
          return txDate >= sevenDaysAgo;
        case '30days':
          return txDate >= thirtyDaysAgo;
        case 'thisMonth':
          return txDate >= thisMonthStart;
        default:
          return true;
      }
    });
    
    filteredTransactions.forEach(tx => {
      const email = tx.user_email || 'Sem usuário';
      const profit = calculateProfit(tx.amount, tx.fee_percentage, tx.fee_fixed);
      
      const existing = userStats.get(email) || { totalProfit: 0, transactionCount: 0 };
      userStats.set(email, {
        totalProfit: existing.totalProfit + profit,
        transactionCount: existing.transactionCount + 1
      });
    });
    
    return Array.from(userStats.entries())
      .map(([email, stats]) => ({
        email,
        totalProfit: stats.totalProfit,
        transactionCount: stats.transactionCount,
        averageProfit: stats.transactionCount > 0 ? stats.totalProfit / stats.transactionCount : 0
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10); // Top 10
  }, [transactions, rankingFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
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

      {/* Projeção Mensal */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Projeção Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {formatCurrency(profitStats.averageDailyProfit)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Média Diária</p>
              <p className="text-xs text-muted-foreground">(últimos 7 dias)</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {formatCurrency(profitStats.monthlyProjection)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Projeção Mensal</p>
              <p className="text-xs text-muted-foreground">(média × 30 dias)</p>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
              <div className={cn(
                "text-2xl sm:text-3xl font-bold flex items-center justify-center gap-1",
                profitStats.trendPercentage > 0 ? "text-green-500" : profitStats.trendPercentage < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {profitStats.trendPercentage > 0 ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : profitStats.trendPercentage < 0 ? (
                  <ArrowDownRight className="h-5 w-5" />
                ) : null}
                {Math.abs(profitStats.trendPercentage).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Tendência</p>
              <p className="text-xs text-muted-foreground">
                {profitStats.trendPercentage > 0 ? "em alta" : profitStats.trendPercentage < 0 ? "em queda" : "estável"}
              </p>
            </div>
          </div>
          {profitStats.daysWithData === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Sem dados suficientes para projeção. Aguarde transações nos últimos 7 dias.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Meta Mensal */}
      <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Goal className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            Meta Mensal
          </CardTitle>
          <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setGoalInput(monthlyGoal.toString())}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Meta Mensal de Lucro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Meta de lucro mensal (R$)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: 10000"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                  />
                </div>
                <Button onClick={saveMonthlyGoal} className="w-full">
                  <Check className="h-4 w-4 mr-2" />
                  Salvar Meta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {monthlyGoal > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {formatCurrency(profitStats.thisMonth)} / {formatCurrency(monthlyGoal)}
                </span>
              </div>
              <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                    profitStats.thisMonth >= monthlyGoal 
                      ? "bg-green-500" 
                      : profitStats.thisMonth >= monthlyGoal * 0.7 
                        ? "bg-yellow-500" 
                        : "bg-primary"
                  )}
                  style={{ width: `${Math.min((profitStats.thisMonth / monthlyGoal) * 100, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {((profitStats.thisMonth / monthlyGoal) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Alcançado</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(Math.max(monthlyGoal - profitStats.thisMonth, 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Faltam</p>
                </div>
                <div>
                  <p className={cn(
                    "text-2xl font-bold",
                    profitStats.thisMonth >= monthlyGoal ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {profitStats.thisMonth >= monthlyGoal ? '🎉' : '⏳'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profitStats.thisMonth >= monthlyGoal ? 'Meta batida!' : 'Em andamento'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Nenhuma meta definida. Defina uma meta para acompanhar seu progresso.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setGoalInput('');
                  setIsGoalDialogOpen(true);
                }}
              >
                <Goal className="h-4 w-4 mr-2" />
                Definir Meta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparativo Mensal */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <GitCompare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            Comparativo Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {formatCurrency(profitStats.lastMonth)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Mês Anterior</p>
              <p className="text-xs text-muted-foreground">
                {new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {formatCurrency(profitStats.thisMonth)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Mês Atual</p>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
              </p>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
              <div className={cn(
                "text-2xl sm:text-3xl font-bold flex items-center justify-center gap-1",
                profitStats.monthOverMonthChange > 0 ? "text-green-500" : profitStats.monthOverMonthChange < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {profitStats.monthOverMonthChange > 0 ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : profitStats.monthOverMonthChange < 0 ? (
                  <ArrowDownRight className="h-5 w-5" />
                ) : null}
                {profitStats.monthOverMonthChange > 0 ? '+' : ''}{profitStats.monthOverMonthChange.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Variação</p>
              <p className="text-xs text-muted-foreground">
                {profitStats.monthOverMonthChange > 0 ? "crescimento" : profitStats.monthOverMonthChange < 0 ? "redução" : "sem variação"}
              </p>
            </div>
          </div>
          {profitStats.lastMonth === 0 && profitStats.thisMonth === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Sem dados para comparativo. Aguarde transações neste e no mês anterior.
            </p>
          )}
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

      {/* Gráfico de Pizza - Distribuição de Lucro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Distribuição de Lucro por Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userProfitRanking.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum dado disponível para exibição.
            </p>
          ) : (
            <div className="h-[300px] sm:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userProfitRanking.map((user, index) => ({
                      name: user.email.length > 20 ? `${user.email.slice(0, 20)}...` : user.email,
                      value: user.totalProfit,
                      fullEmail: user.email
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  >
                    {userProfitRanking.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={[
                          'hsl(0, 84%, 60%)',      // primary red
                          'hsl(142, 76%, 36%)',    // green
                          'hsl(217, 91%, 60%)',    // blue
                          'hsl(45, 93%, 47%)',     // yellow
                          'hsl(280, 65%, 60%)',    // purple
                          'hsl(180, 70%, 45%)',    // cyan
                          'hsl(25, 95%, 53%)',     // orange
                          'hsl(330, 81%, 60%)',    // pink
                          'hsl(160, 60%, 45%)',    // teal
                          'hsl(200, 70%, 50%)',    // light blue
                        ][index % 10]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                  />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking de Usuários por Lucro */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            Ranking de Lucro por Usuário
          </CardTitle>
          <div className="flex items-center bg-muted rounded-full p-1">
            {rankingFilterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setRankingFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                  rankingFilter === option.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {userProfitRanking.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma transação paga encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-right">Transações</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Lucro Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProfitRanking.map((user, index) => (
                    <TableRow key={user.email}>
                      <TableCell className="font-medium">
                        {index === 0 ? (
                          <span className="text-yellow-500 font-bold">🥇</span>
                        ) : index === 1 ? (
                          <span className="text-gray-400 font-bold">🥈</span>
                        ) : index === 2 ? (
                          <span className="text-amber-600 font-bold">🥉</span>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.email.length > 30 ? `${user.email.slice(0, 30)}...` : user.email}
                      </TableCell>
                      <TableCell className="text-right">{user.transactionCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(user.averageProfit)}</TableCell>
                      <TableCell className="text-right font-bold text-green-500">
                        {formatCurrency(user.totalProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
