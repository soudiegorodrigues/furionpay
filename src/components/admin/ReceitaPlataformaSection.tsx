import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Loader2, RefreshCw, Wallet, Receipt, DollarSign, Calculator, Users, Target, ArrowUpRight, ArrowDownRight, Trophy, PieChartIcon, GitCompare, Goal, Pencil, Check, Search, ChevronDown, X } from "lucide-react";
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
  acquirer: string | null;
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
type AcquirerCostFilter = 'today' | '7days' | 'thisMonth';

const acquirerCostFilterOptions: { value: AcquirerCostFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: 'thisMonth', label: 'Este mês' },
];

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

// Helper para calcular lucro bruto de uma transação (taxa cobrada do usuário)
const calculateGrossProfit = (amount: number, feePercentage: number | null, feeFixed: number | null): number => {
  const percentage = feePercentage ?? 0;
  const fixed = feeFixed ?? 0;
  return (amount * percentage / 100) + fixed;
};

// Interface para configurações de custo de adquirente
interface AcquirerFees {
  spedpay: { rate: number; fixed: number };
  inter: { rate: number; fixed: number };
  ativus: { rate: number; fixed: number };
}

// Helper para calcular custo do adquirente sobre a venda bruta
const calculateAcquirerCost = (
  amount: number, 
  acquirer: string | null, 
  acquirerFees: AcquirerFees
): number => {
  const acq = (acquirer || 'spedpay') as keyof AcquirerFees;
  const fees = acquirerFees[acq] || acquirerFees.spedpay;
  return (amount * fees.rate / 100) + fees.fixed;
};

// Manter compatibilidade com nome antigo
const calculateProfit = calculateGrossProfit;

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
  const [acquirerCostFilter, setAcquirerCostFilter] = useState<AcquirerCostFilter>('thisMonth');
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [goalInput, setGoalInput] = useState<string>('');
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);
  const [acquirerFees, setAcquirerFees] = useState<AcquirerFees>({
    spedpay: { rate: 0, fixed: 0 },
    inter: { rate: 0, fixed: 0 },
    ativus: { rate: 0, fixed: 0 }
  });

  useEffect(() => {
    loadTransactions();
    loadMonthlyGoal();
    loadAcquirerFees();
  }, []);

  const loadAcquirerFees = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_settings_auth');
      if (error) throw error;
      
      const fees: AcquirerFees = {
        spedpay: { rate: 0, fixed: 0 },
        inter: { rate: 0, fixed: 0 },
        ativus: { rate: 0, fixed: 0 }
      };
      
      data?.forEach((s: { key: string; value: string }) => {
        if (s.key === 'spedpay_fee_rate') fees.spedpay.rate = parseFloat(s.value) || 0;
        if (s.key === 'spedpay_fixed_fee') fees.spedpay.fixed = parseFloat(s.value) || 0;
        if (s.key === 'inter_fee_rate') fees.inter.rate = parseFloat(s.value) || 0;
        if (s.key === 'inter_fixed_fee') fees.inter.fixed = parseFloat(s.value) || 0;
        if (s.key === 'ativus_fee_rate') fees.ativus.rate = parseFloat(s.value) || 0;
        if (s.key === 'ativus_fixed_fee') fees.ativus.fixed = parseFloat(s.value) || 0;
      });
      
      console.log('Loaded acquirer fees:', fees);
      setAcquirerFees(fees);
    } catch (error) {
      console.error('Error loading acquirer fees:', error);
    }
  };

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

  // Filtrar usuários baseado na busca
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return uniqueUsers;
    const query = userSearchQuery.toLowerCase();
    return uniqueUsers.filter(email => 
      email.toLowerCase().includes(query)
    );
  }, [uniqueUsers, userSearchQuery]);

  // Filtrar transações pagas e por usuário selecionado
  const paidTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const isPaid = tx.status === 'paid';
      const matchesUser = selectedUser === 'all' || tx.user_email === selectedUser;
      return isPaid && matchesUser;
    });
  }, [transactions, selectedUser]);

  // Calcular lucros por período (com custos de adquirente)
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

    // Receita bruta (taxas cobradas dos usuários)
    let todayGross = 0;
    let sevenDaysGross = 0;
    let fifteenDaysGross = 0;
    let thirtyDaysGross = 0;
    let thisMonthGross = 0;
    let lastMonthGross = 0;
    let thisYearGross = 0;
    let totalGross = 0;
    
    // Custos de adquirentes
    let todayAcquirerCost = 0;
    let sevenDaysAcquirerCost = 0;
    let fifteenDaysAcquirerCost = 0;
    let thirtyDaysAcquirerCost = 0;
    let thisMonthAcquirerCost = 0;
    let lastMonthAcquirerCost = 0;
    let thisYearAcquirerCost = 0;
    let totalAcquirerCost = 0;
    
    // Contadores por adquirente (por período)
    const acquirerBreakdown = {
      spedpay: { 
        total: { count: 0, cost: 0, volume: 0 },
        today: { count: 0, cost: 0, volume: 0 },
        sevenDays: { count: 0, cost: 0, volume: 0 },
        thisMonth: { count: 0, cost: 0, volume: 0 }
      },
      inter: { 
        total: { count: 0, cost: 0, volume: 0 },
        today: { count: 0, cost: 0, volume: 0 },
        sevenDays: { count: 0, cost: 0, volume: 0 },
        thisMonth: { count: 0, cost: 0, volume: 0 }
      },
      ativus: { 
        total: { count: 0, cost: 0, volume: 0 },
        today: { count: 0, cost: 0, volume: 0 },
        sevenDays: { count: 0, cost: 0, volume: 0 },
        thisMonth: { count: 0, cost: 0, volume: 0 }
      }
    };

    // Para calcular média diária dos últimos 7 dias
    const dailyProfits: Map<string, number> = new Map();

    paidTransactions.forEach(tx => {
      const grossProfit = calculateGrossProfit(tx.amount, tx.fee_percentage, tx.fee_fixed);
      const acquirerCost = calculateAcquirerCost(tx.amount, tx.acquirer, acquirerFees);
      
      totalGross += grossProfit;
      totalAcquirerCost += acquirerCost;
      
      // Track acquirer breakdown por período
      const acq = (tx.acquirer || 'spedpay') as keyof typeof acquirerBreakdown;
      const txDate = tx.paid_at ? new Date(tx.paid_at) : new Date(tx.created_at);
      const txDateStr = getBrazilDateStr(txDate);
      
      if (acquirerBreakdown[acq]) {
        // Total
        acquirerBreakdown[acq].total.count++;
        acquirerBreakdown[acq].total.cost += acquirerCost;
        acquirerBreakdown[acq].total.volume += tx.amount;
        
        // Hoje
        if (txDateStr === todayStr) {
          acquirerBreakdown[acq].today.count++;
          acquirerBreakdown[acq].today.cost += acquirerCost;
          acquirerBreakdown[acq].today.volume += tx.amount;
        }
        
        // 7 dias
        if (txDate >= sevenDaysAgo) {
          acquirerBreakdown[acq].sevenDays.count++;
          acquirerBreakdown[acq].sevenDays.cost += acquirerCost;
          acquirerBreakdown[acq].sevenDays.volume += tx.amount;
        }
        
        // Este mês
        if (txDate >= thisMonthStart) {
          acquirerBreakdown[acq].thisMonth.count++;
          acquirerBreakdown[acq].thisMonth.cost += acquirerCost;
          acquirerBreakdown[acq].thisMonth.volume += tx.amount;
        }
      }

      // Hoje
      if (txDateStr === todayStr) {
        todayGross += grossProfit;
        todayAcquirerCost += acquirerCost;
      }

      // 7 dias
      if (txDate >= sevenDaysAgo) {
        sevenDaysGross += grossProfit;
        sevenDaysAcquirerCost += acquirerCost;
        // Acumular lucro líquido diário para cálculo de média
        const existingProfit = dailyProfits.get(txDateStr) || 0;
        dailyProfits.set(txDateStr, existingProfit + (grossProfit - acquirerCost));
      }

      // 15 dias
      if (txDate >= fifteenDaysAgo) {
        fifteenDaysGross += grossProfit;
        fifteenDaysAcquirerCost += acquirerCost;
      }

      // 30 dias
      if (txDate >= thirtyDaysAgo) {
        thirtyDaysGross += grossProfit;
        thirtyDaysAcquirerCost += acquirerCost;
      }

      // Este mês
      if (txDate >= thisMonthStart) {
        thisMonthGross += grossProfit;
        thisMonthAcquirerCost += acquirerCost;
      }

      // Mês anterior
      if (txDate >= lastMonthStart && txDate <= lastMonthEnd) {
        lastMonthGross += grossProfit;
        lastMonthAcquirerCost += acquirerCost;
      }

      // Este ano
      if (txDate >= thisYearStart) {
        thisYearGross += grossProfit;
        thisYearAcquirerCost += acquirerCost;
      }
    });

    // Calcular lucros líquidos (receita bruta - custos adquirentes)
    const todayNet = todayGross - todayAcquirerCost;
    const sevenDaysNet = sevenDaysGross - sevenDaysAcquirerCost;
    const fifteenDaysNet = fifteenDaysGross - fifteenDaysAcquirerCost;
    const thirtyDaysNet = thirtyDaysGross - thirtyDaysAcquirerCost;
    const thisMonthNet = thisMonthGross - thisMonthAcquirerCost;
    const lastMonthNet = lastMonthGross - lastMonthAcquirerCost;
    const thisYearNet = thisYearGross - thisYearAcquirerCost;
    const totalNet = totalGross - totalAcquirerCost;

    // Calcular média diária baseada nos últimos 7 dias (lucro líquido)
    const daysWithData = dailyProfits.size;
    const averageDailyProfit = daysWithData > 0 ? sevenDaysNet / 7 : 0;
    
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

    // Variação mês atual vs mês anterior (usando lucro líquido)
    const monthOverMonthChange = lastMonthNet > 0 
      ? ((thisMonthNet - lastMonthNet) / lastMonthNet) * 100 
      : thisMonthNet > 0 ? 100 : 0;

    return {
      // Receita bruta (compatibilidade)
      today: todayNet,
      sevenDays: sevenDaysNet,
      fifteenDays: fifteenDaysNet,
      thirtyDays: thirtyDaysNet,
      thisMonth: thisMonthNet,
      lastMonth: lastMonthNet,
      monthOverMonthChange,
      thisYear: thisYearNet,
      total: totalNet,
      // Novos campos detalhados
      gross: {
        today: todayGross,
        sevenDays: sevenDaysGross,
        fifteenDays: fifteenDaysGross,
        thirtyDays: thirtyDaysGross,
        thisMonth: thisMonthGross,
        lastMonth: lastMonthGross,
        thisYear: thisYearGross,
        total: totalGross
      },
      acquirerCosts: {
        today: todayAcquirerCost,
        sevenDays: sevenDaysAcquirerCost,
        fifteenDays: fifteenDaysAcquirerCost,
        thirtyDays: thirtyDaysAcquirerCost,
        thisMonth: thisMonthAcquirerCost,
        lastMonth: lastMonthAcquirerCost,
        thisYear: thisYearAcquirerCost,
        total: totalAcquirerCost
      },
      acquirerBreakdown,
      transactionCount: paidTransactions.length,
      averageProfit: paidTransactions.length > 0 ? totalNet / paidTransactions.length : 0,
      averageDailyProfit,
      monthlyProjection,
      trendPercentage,
      daysWithData
    };
  }, [paidTransactions, acquirerFees]);

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
            {/* Filtro por usuário com busca */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[180px] sm:w-[220px] h-9 text-xs sm:text-sm justify-between"
                  >
                    <span className="truncate">
                      {selectedUser === 'all' 
                        ? 'Todos os usuários' 
                        : selectedUser.length > 20 
                          ? `${selectedUser.slice(0, 20)}...` 
                          : selectedUser}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-8 h-9"
                      />
                      {userSearchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-7 w-7 p-0"
                          onClick={() => setUserSearchQuery('')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto p-1">
                    <Button
                      variant={selectedUser === 'all' ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-sm h-8"
                      onClick={() => {
                        setSelectedUser('all');
                        setUserSearchQuery('');
                        setIsUserPopoverOpen(false);
                      }}
                    >
                      Todos os usuários
                    </Button>
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum usuário encontrado
                      </p>
                    ) : (
                      filteredUsers.map(email => (
                        <Button
                          key={email}
                          variant={selectedUser === email ? 'secondary' : 'ghost'}
                          className="w-full justify-start text-sm h-8 truncate"
                          onClick={() => {
                            setSelectedUser(email);
                            setUserSearchQuery('');
                            setIsUserPopoverOpen(false);
                          }}
                        >
                          {email}
                        </Button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg">
                  <div className="text-sm sm:text-base font-semibold text-primary">
                    {formatCurrency(profitStats.today)}
                  </div>
                  <p className="text-xs text-muted-foreground">Hoje</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm sm:text-base font-semibold text-foreground">
                    {formatCurrency(profitStats.sevenDays)}
                  </div>
                  <p className="text-xs text-muted-foreground">7 Dias</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm sm:text-base font-semibold text-foreground">
                    {formatCurrency(profitStats.fifteenDays)}
                  </div>
                  <p className="text-xs text-muted-foreground">15 Dias</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm sm:text-base font-semibold text-foreground">
                    {formatCurrency(profitStats.thisMonth)}
                  </div>
                  <p className="text-xs text-muted-foreground">Este Mês</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-green-500/10 rounded-lg col-span-2 sm:col-span-1">
                  <div className="text-sm sm:text-base font-semibold text-green-500">
                    {formatCurrency(profitStats.thisYear)}
                  </div>
                  <p className="text-xs text-muted-foreground">Este Ano</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Breakdown: Receita Bruta vs Custo Adquirentes vs Lucro Líquido */}
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Calculator className="h-4 w-4 text-amber-500" />
            Breakdown: Receita vs Custos (Este Mês)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-sm sm:text-base font-semibold text-blue-500">
                {formatCurrency(profitStats.gross.thisMonth)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Receita Bruta</p>
              <p className="text-[10px] text-muted-foreground">(Taxas cobradas dos usuários)</p>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="text-sm sm:text-base font-semibold text-red-500">
                -{formatCurrency(profitStats.acquirerCosts.thisMonth)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Custo Adquirentes</p>
              <p className="text-[10px] text-muted-foreground">(SpedPay, Inter, Ativus)</p>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="text-sm sm:text-base font-semibold text-green-500">
                {formatCurrency(profitStats.thisMonth)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Lucro Líquido</p>
              <p className="text-[10px] text-muted-foreground">(Receita - Custos)</p>
            </div>
          </div>
          
          {/* Taxa de margem */}
          {profitStats.gross.thisMonth > 0 && (
            <div className="text-center">
              <span className="text-xs text-muted-foreground">
                Margem: <span className="font-semibold text-foreground">
                  {((profitStats.thisMonth / profitStats.gross.thisMonth) * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Detalhado: Custos por Adquirente */}
      {(profitStats.acquirerBreakdown.spedpay.total.count > 0 || 
        profitStats.acquirerBreakdown.inter.total.count > 0 || 
        profitStats.acquirerBreakdown.ativus.total.count > 0) && (() => {
        // Helper para obter dados do período selecionado
        const getPeriodKey = () => {
          if (acquirerCostFilter === '7days') return 'sevenDays';
          return acquirerCostFilter;
        };
        const periodKey = getPeriodKey();
        const getPeriodLabel = () => {
          switch(acquirerCostFilter) {
            case 'today': return 'Hoje';
            case '7days': return '7 dias';
            case 'thisMonth': return 'Este mês';
          }
        };
        
        const spedpayData = profitStats.acquirerBreakdown.spedpay[periodKey];
        const interData = profitStats.acquirerBreakdown.inter[periodKey];
        const ativusData = profitStats.acquirerBreakdown.ativus[periodKey];
        
        const totalCost = spedpayData.cost + interData.cost + ativusData.cost;
        const totalCount = spedpayData.count + interData.count + ativusData.count;
        const avgCost = totalCount > 0 ? totalCost / totalCount : 0;
        
        return (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Custos por Adquirente ({getPeriodLabel()})
              </CardTitle>
              
              <div className="flex items-center bg-muted rounded-full p-1">
                {acquirerCostFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAcquirerCostFilter(option.value)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full transition-all",
                      acquirerCostFilter === option.value
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
            {/* Resumo e Gráfico de Pizza */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Gráfico de Pizza */}
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'SpedPay', value: spedpayData.cost, color: '#3B82F6' },
                        { name: 'Banco Inter', value: interData.cost, color: '#F97316' },
                        { name: 'Ativus Hub', value: ativusData.cost, color: '#10B981' }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {[
                        { name: 'SpedPay', value: spedpayData.cost, color: '#3B82F6' },
                        { name: 'Banco Inter', value: interData.cost, color: '#F97316' },
                        { name: 'Ativus Hub', value: ativusData.cost, color: '#10B981' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 gap-2 content-start">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(totalCost)}
                  </div>
                  <p className="text-xs text-muted-foreground">Custo Total</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">
                    {totalCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Transações</p>
                </div>
                <div className="col-span-2 text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(avgCost)}
                  </div>
                  <p className="text-xs text-muted-foreground">Custo Médio/TX</p>
                </div>
              </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Adquirente</TableHead>
                    <TableHead className="text-xs text-center">Taxa Config.</TableHead>
                    <TableHead className="text-xs text-center">TXs</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Volume</TableHead>
                    <TableHead className="text-xs text-right">Custo</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Médio/TX</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* SpedPay */}
                  <TableRow className={spedpayData.count === 0 ? 'opacity-50' : ''}>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-xs font-medium">SpedPay</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center text-muted-foreground">
                      {acquirerFees.spedpay.rate}% + R$ {acquirerFees.spedpay.fixed.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium">
                      {spedpayData.count}
                    </TableCell>
                    <TableCell className="text-xs text-right hidden sm:table-cell">
                      {formatCurrency(spedpayData.volume)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium text-red-500">
                      {formatCurrency(spedpayData.cost)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground hidden sm:table-cell">
                      {spedpayData.count > 0 
                        ? formatCurrency(spedpayData.cost / spedpayData.count)
                        : '-'}
                    </TableCell>
                  </TableRow>

                  {/* Banco Inter */}
                  <TableRow className={interData.count === 0 ? 'opacity-50' : ''}>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span className="text-xs font-medium">Banco Inter</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center text-muted-foreground">
                      {acquirerFees.inter.rate}% + R$ {acquirerFees.inter.fixed.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium">
                      {interData.count}
                    </TableCell>
                    <TableCell className="text-xs text-right hidden sm:table-cell">
                      {formatCurrency(interData.volume)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium text-red-500">
                      {formatCurrency(interData.cost)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground hidden sm:table-cell">
                      {interData.count > 0 
                        ? formatCurrency(interData.cost / interData.count)
                        : '-'}
                    </TableCell>
                  </TableRow>

                  {/* Ativus Hub */}
                  <TableRow className={ativusData.count === 0 ? 'opacity-50' : ''}>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium">Ativus Hub</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center text-muted-foreground">
                      {acquirerFees.ativus.rate}% + R$ {acquirerFees.ativus.fixed.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium">
                      {ativusData.count}
                    </TableCell>
                    <TableCell className="text-xs text-right hidden sm:table-cell">
                      {formatCurrency(ativusData.volume)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium text-red-500">
                      {formatCurrency(ativusData.cost)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground hidden sm:table-cell">
                      {ativusData.count > 0 
                        ? formatCurrency(ativusData.cost / ativusData.count)
                        : '-'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        );
      })()}

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
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Target className="h-4 w-4 text-primary" />
            Projeção Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-background/50 rounded-lg border border-border/50">
              <div className="text-sm sm:text-base font-semibold text-foreground">
                {formatCurrency(profitStats.averageDailyProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Média Diária</p>
              <p className="text-xs text-muted-foreground">(últimos 7 dias)</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-sm sm:text-base font-semibold text-primary">
                {formatCurrency(profitStats.monthlyProjection)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Projeção Mensal</p>
              <p className="text-xs text-muted-foreground">(média × 30 dias)</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-background/50 rounded-lg border border-border/50">
              <div className={cn(
                "text-sm sm:text-base font-semibold flex items-center justify-center gap-1",
                profitStats.trendPercentage > 0 ? "text-green-500" : profitStats.trendPercentage < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {profitStats.trendPercentage > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : profitStats.trendPercentage < 0 ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : null}
                {Math.abs(profitStats.trendPercentage).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Tendência</p>
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Goal className="h-4 w-4 text-green-500" />
            Meta Mensal
          </CardTitle>
          <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 text-xs"
                onClick={() => setGoalInput(monthlyGoal.toString())}
              >
                <Pencil className="h-3 w-3 mr-1" />
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
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {formatCurrency(profitStats.thisMonth)} / {formatCurrency(monthlyGoal)}
                </span>
              </div>
              <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
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
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm sm:text-base font-semibold text-foreground">
                    {((profitStats.thisMonth / monthlyGoal) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Alcançado</p>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-foreground">
                    {formatCurrency(Math.max(monthlyGoal - profitStats.thisMonth, 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Faltam</p>
                </div>
                <div>
                  <p className={cn(
                    "text-sm sm:text-base font-semibold",
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
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <GitCompare className="h-4 w-4 text-blue-500" />
            Comparativo Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-background/50 rounded-lg border border-border/50">
              <div className="text-sm sm:text-base font-semibold text-foreground">
                {formatCurrency(profitStats.lastMonth)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Mês Anterior</p>
              <p className="text-xs text-muted-foreground">
                {new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-sm sm:text-base font-semibold text-primary">
                {formatCurrency(profitStats.thisMonth)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Mês Atual</p>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-background/50 rounded-lg border border-border/50">
              <div className={cn(
                "text-sm sm:text-base font-semibold flex items-center justify-center gap-1",
                profitStats.monthOverMonthChange > 0 ? "text-green-500" : profitStats.monthOverMonthChange < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {profitStats.monthOverMonthChange > 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : profitStats.monthOverMonthChange < 0 ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : null}
                {profitStats.monthOverMonthChange > 0 ? '+' : ''}{profitStats.monthOverMonthChange.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Variação</p>
              <p className="text-xs text-muted-foreground">
                {profitStats.monthOverMonthChange > 0 ? "crescimento" : profitStats.monthOverMonthChange < 0 ? "redução" : "sem variação"}
              </p>
            </div>
          </div>
          {profitStats.lastMonth === 0 && profitStats.thisMonth === 0 && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              Sem dados para comparativo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas Gerais */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Calculator className="h-4 w-4 text-primary" />
            Estatísticas Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Receipt className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold">{profitStats.transactionCount}</p>
                <p className="text-xs text-muted-foreground">Transações Pagas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
              <div className="p-2 bg-green-500/10 rounded-full">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold">{formatCurrency(profitStats.total)}</p>
                <p className="text-xs text-muted-foreground">Lucro Acumulado</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold">{formatCurrency(profitStats.averageProfit)}</p>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
              </div>
            </div>
          </div>
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
