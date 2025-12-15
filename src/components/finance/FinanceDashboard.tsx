import { useState, useEffect, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Target,
  BarChart3,
  DollarSign,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LabelList
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  spending_limit: number | null;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  investment: number;
  balance: number;
}

type PeriodFilter = 'month' | 'quarter' | 'semester' | 'year' | 'all';

const COLORS = {
  income: '#22c55e',
  expense: '#ef4444',
  investment: '#a855f7',
  balance: '#3b82f6'
};

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Este Mês' },
  { value: 'quarter', label: 'Este Trimestre' },
  { value: 'semester', label: 'Este Semestre' },
  { value: 'year', label: 'Este Ano' },
  { value: 'all', label: 'Todo Período' }
];

export const FinanceDashboard = () => {
  const { user } = useAdminAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('user_id', user!.id)
          .order('date', { ascending: false }),
        supabase
          .from('finance_categories')
          .select('*')
          .eq('user_id', user!.id)
      ]);

      if (transactionsRes.data) setTransactions(transactionsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = (period: PeriodFilter): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;

    switch (period) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'semester':
        const semesterStart = now.getMonth() < 6 ? 0 : 6;
        start = new Date(now.getFullYear(), semesterStart, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        start = new Date(2000, 0, 1);
        break;
    }

    return { start, end };
  };

  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRange(periodFilter);
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date >= start && date <= end;
    });
  }, [transactions, periodFilter]);

  const getPreviousPeriodRange = (period: PeriodFilter): { start: Date; end: Date } => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'month':
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        start = new Date(prevYear, prevMonth, 1);
        end = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const prevQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        start = new Date(prevQuarterYear, prevQuarter * 3, 1);
        end = new Date(prevQuarterYear, prevQuarter * 3 + 3, 0, 23, 59, 59);
        break;
      case 'semester':
        const currentSemester = now.getMonth() < 6 ? 0 : 1;
        const prevSemester = currentSemester === 0 ? 1 : 0;
        const prevSemYear = currentSemester === 0 ? now.getFullYear() - 1 : now.getFullYear();
        start = new Date(prevSemYear, prevSemester * 6, 1);
        end = new Date(prevSemYear, prevSemester * 6 + 6, 0, 23, 59, 59);
        break;
      case 'year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      default:
        start = new Date(2000, 0, 1);
        end = new Date(2000, 0, 1);
    }

    return { start, end };
  };

  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalInvestment = filteredTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalIncome - totalExpense - totalInvestment;

    // Calculate previous period for comparison
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(periodFilter);
    
    const prevPeriodTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= prevStart && date <= prevEnd;
    });

    const prevIncome = prevPeriodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const prevExpense = prevPeriodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
    const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;

    return { totalIncome, totalExpense, totalInvestment, balance, incomeChange, expenseChange };
  }, [filteredTransactions, transactions, periodFilter]);

  const expensesByCategory = useMemo(() => {
    const periodExpenses = filteredTransactions.filter(t => t.type === 'expense');

    const grouped: Record<string, { name: string; value: number; color: string; categoryId: string }> = {};

    periodExpenses.forEach(t => {
      const category = categories.find(c => c.id === t.category_id);
      const key = category?.id || 'uncategorized';
      if (!grouped[key]) {
        grouped[key] = {
          name: category?.name || 'Sem categoria',
          value: 0,
          color: category?.color || '#6b7280',
          categoryId: key
        };
      }
      grouped[key].value += Number(t.amount);
    });

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [filteredTransactions, categories]);

  const incomeByCategory = useMemo(() => {
    const periodIncome = filteredTransactions.filter(t => t.type === 'income');

    const grouped: Record<string, { name: string; value: number; color: string }> = {};

    periodIncome.forEach(t => {
      const category = categories.find(c => c.id === t.category_id);
      const key = category?.id || 'uncategorized';
      if (!grouped[key]) {
        grouped[key] = {
          name: category?.name || 'Sem categoria',
          value: 0,
          color: category?.color || '#22c55e'
        };
      }
      grouped[key].value += Number(t.amount);
    });

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [filteredTransactions, categories]);

  const monthlyData = useMemo(() => {
    const months: MonthlyData[] = [];
    const now = new Date();
    
    // Adjust number of months based on period filter
    const monthsToShow = periodFilter === 'year' ? 12 : 
                         periodFilter === 'semester' ? 6 :
                         periodFilter === 'quarter' ? 3 : 6;

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleDateString('pt-BR', { month: 'short' });

      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === date.getMonth() && 
               tDate.getFullYear() === date.getFullYear();
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const investment = monthTransactions
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      months.push({
        month: month.charAt(0).toUpperCase() + month.slice(1),
        income,
        expense,
        investment,
        balance: income - expense - investment
      });
    }

    return months;
  }, [transactions, periodFilter]);

  const comparisonData = useMemo(() => {
    return [
      { name: 'Receitas', value: stats.totalIncome, fill: COLORS.income },
      { name: 'Despesas', value: stats.totalExpense, fill: COLORS.expense },
      { name: 'Investimentos', value: stats.totalInvestment, fill: COLORS.investment }
    ];
  }, [stats]);

  // Calculate spending alerts for categories that exceeded their limit
  const spendingAlerts = useMemo(() => {
    const alerts: { categoryName: string; spent: number; limit: number; percentOver: number; color: string }[] = [];
    
    expensesByCategory.forEach(expense => {
      const category = categories.find(c => c.id === expense.categoryId);
      if (category?.spending_limit && expense.value > category.spending_limit) {
        const percentOver = ((expense.value - category.spending_limit) / category.spending_limit) * 100;
        alerts.push({
          categoryName: category.name,
          spent: expense.value,
          limit: category.spending_limit,
          percentOver,
          color: category.color
        });
      }
    });

    return alerts.sort((a, b) => b.percentOver - a.percentOver);
  }, [expensesByCategory, categories]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getPeriodLabel = () => {
    return PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label || 'Período';
  };

  return (
    <div className="space-y-4">
      {/* Spending Alerts */}
      {spendingAlerts.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-base">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Limite de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {spendingAlerts.map((alert, index) => (
              <div 
                key={index} 
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-background/80 border border-amber-200 dark:border-amber-800"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: alert.color }}
                  />
                  <div>
                    <p className="font-medium text-foreground">{alert.categoryName}</p>
                    <p className="text-xs text-muted-foreground">
                      Limite: {formatCurrency(alert.limit)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:text-right">
                  <div>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(alert.spent)}
                    </p>
                    <p className="text-xs text-red-500">
                      +{alert.percentOver.toFixed(0)}% acima do limite
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Resumo Financeiro</h2>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards with Circular Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Receitas */}
        <Card className="border border-border/50">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.min((stats.totalIncome / (stats.totalIncome + stats.totalExpense + stats.totalInvestment || 1)) * 100, 100)}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-sm md:text-base font-bold text-green-600">
                  {formatCurrency(stats.totalIncome)}
                </p>
                {stats.incomeChange !== 0 && periodFilter !== 'all' && (
                  <p className={`text-xs ${stats.incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(stats.incomeChange)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="border border-border/50">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.min((stats.totalExpense / (stats.totalIncome + stats.totalExpense + stats.totalInvestment || 1)) * 100, 100)}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-sm md:text-base font-bold text-red-600">
                  {formatCurrency(stats.totalExpense)}
                </p>
                {stats.expenseChange !== 0 && periodFilter !== 'all' && (
                  <p className={`text-xs ${stats.expenseChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(stats.expenseChange)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investimentos */}
        <Card className="border border-border/50">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.min((stats.totalInvestment / (stats.totalIncome + stats.totalExpense + stats.totalInvestment || 1)) * 100, 100)}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <PiggyBank className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Investimentos</p>
                <p className="text-sm md:text-base font-bold text-purple-600">
                  {formatCurrency(stats.totalInvestment)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saldo */}
        <Card className="border border-border/50">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke={stats.balance >= 0 ? "hsl(var(--primary))" : "#ef4444"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.totalIncome > 0 ? Math.min(Math.abs(stats.balance) / stats.totalIncome * 100, 100) : 0}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-sm md:text-base font-bold ${stats.balance >= 0 ? 'text-primary' : 'text-red-600'}`}>
                  {formatCurrency(stats.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-3">
        {/* Income vs Expense Comparison - Minimalist Progress Bars */}
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Visão Geral Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.totalIncome === 0 && stats.totalExpense === 0 && stats.totalInvestment === 0 ? (
              <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              <div className="space-y-5">
                {/* Receitas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium">Receitas</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(stats.totalIncome)}
                    </span>
                  </div>
                  <Progress 
                    value={stats.totalIncome + stats.totalExpense + stats.totalInvestment > 0 
                      ? (stats.totalIncome / (stats.totalIncome + stats.totalExpense + stats.totalInvestment)) * 100 
                      : 0} 
                    className="h-2.5 bg-muted [&>div]:bg-emerald-500"
                  />
                </div>

                {/* Despesas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-sm font-medium">Despesas</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(stats.totalExpense)}
                    </span>
                  </div>
                  <Progress 
                    value={stats.totalIncome + stats.totalExpense + stats.totalInvestment > 0 
                      ? (stats.totalExpense / (stats.totalIncome + stats.totalExpense + stats.totalInvestment)) * 100 
                      : 0} 
                    className="h-2.5 bg-muted [&>div]:bg-red-500"
                  />
                </div>

                {/* Investimentos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">Investimentos</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(stats.totalInvestment)}
                    </span>
                  </div>
                  <Progress 
                    value={stats.totalIncome + stats.totalExpense + stats.totalInvestment > 0 
                      ? (stats.totalInvestment / (stats.totalIncome + stats.totalExpense + stats.totalInvestment)) * 100 
                      : 0} 
                    className="h-2.5 bg-muted [&>div]:bg-blue-500"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Evolution Chart */}
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.income} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis 
                    className="text-xs"
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    name="Receitas"
                    stroke={COLORS.income}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expense" 
                    name="Despesas"
                    stroke={COLORS.expense}
                    fillOpacity={1} 
                    fill="url(#colorExpense)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Balance Bar Chart */}
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Saldo Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 28, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis 
                    className="text-xs"
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Bar 
                    dataKey="balance" 
                    name="Saldo"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="balance"
                      position="top"
                      offset={8}
                      formatter={(value: number) => {
                        if (value === 0) return "";
                        return `R$ ${value.toLocaleString("pt-BR")}`;
                      }}
                      style={{ fontSize: "10px", fill: "hsl(var(--foreground))" }}
                    />
                    {monthlyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.balance >= 0 ? COLORS.income : COLORS.expense} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Charts */}
      <div className="grid grid-cols-1 gap-3">
        {/* Income by Category */}
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              Receitas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {incomeByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ cx, cy, midAngle, outerRadius, value }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 20;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="hsl(var(--foreground))"
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            style={{ fontSize: '10px' }}
                          >
                            {`R$ ${value.toLocaleString('pt-BR')}`}
                          </text>
                        );
                      }}
                      labelLine={{
                        stroke: 'hsl(var(--muted-foreground))',
                        strokeWidth: 1
                      }}
                    >
                      {incomeByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend 
                      formatter={(value) => {
                        return value;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ArrowUpRight className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma receita registrada este mês</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ cx, cy, midAngle, outerRadius, value }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 20;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="hsl(var(--foreground))"
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            style={{ fontSize: '10px' }}
                          >
                            {`R$ ${value.toLocaleString('pt-BR')}`}
                          </text>
                        );
                      }}
                      labelLine={{
                        stroke: 'hsl(var(--muted-foreground))',
                        strokeWidth: 1
                      }}
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend 
                      formatter={(value) => {
                        return value;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ArrowDownRight className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma despesa registrada este mês</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories Table */}
      {(expensesByCategory.length > 0 || incomeByCategory.length > 0) && (
        <div className="grid grid-cols-1 gap-3">
          {/* Top Expenses */}
          {expensesByCategory.length > 0 && (
            <Card className="border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Top Despesas do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expensesByCategory.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({((item.value / stats.totalExpense) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Income */}
          {incomeByCategory.length > 0 && (
            <Card className="border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Top Receitas do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {incomeByCategory.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({((item.value / stats.totalIncome) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};