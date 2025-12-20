import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Loader2, RefreshCw, Wallet, Receipt, DollarSign, Calculator, Users, Target, ArrowUpRight, ArrowDownRight, Trophy, PieChartIcon, GitCompare, Goal, Pencil, Check, Search, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ChartData {
  date: string;
  lucro: number;
}

interface UserProfitRanking {
  email: string;
  total_profit: number;
  transaction_count: number;
  average_profit: number;
}

interface ProfitStats {
  today: number;
  sevenDays: number;
  fifteenDays: number;
  thirtyDays: number;
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  total: number;
  gross: {
    today: number;
    sevenDays: number;
    fifteenDays: number;
    thirtyDays: number;
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    total: number;
  };
  acquirerCosts: {
    today: number;
    sevenDays: number;
    fifteenDays: number;
    thirtyDays: number;
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    total: number;
  };
  acquirerBreakdown: {
    [key: string]: {
      today: { count: number; cost: number; volume: number };
      sevenDays: { count: number; cost: number; volume: number };
      thisMonth: { count: number; cost: number; volume: number };
      total: { count: number; cost: number; volume: number };
    };
  } | null;
  transactionCount: number;
  averageProfit: number;
  averageDailyProfit: number;
  monthlyProjection: number;
  daysWithData: number;
  monthOverMonthChange: number;
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

const defaultProfitStats: ProfitStats = {
  today: 0,
  sevenDays: 0,
  fifteenDays: 0,
  thirtyDays: 0,
  thisMonth: 0,
  lastMonth: 0,
  thisYear: 0,
  total: 0,
  gross: { today: 0, sevenDays: 0, fifteenDays: 0, thirtyDays: 0, thisMonth: 0, lastMonth: 0, thisYear: 0, total: 0 },
  acquirerCosts: { today: 0, sevenDays: 0, fifteenDays: 0, thirtyDays: 0, thisMonth: 0, lastMonth: 0, thisYear: 0, total: 0 },
  acquirerBreakdown: null,
  transactionCount: 0,
  averageProfit: 0,
  averageDailyProfit: 0,
  monthlyProjection: 0,
  daysWithData: 0,
  monthOverMonthChange: 0
};

export const ReceitaPlataformaSection = () => {
  const [profitStats, setProfitStats] = useState<ProfitStats>(defaultProfitStats);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [userProfitRanking, setUserProfitRanking] = useState<UserProfitRanking[]>([]);
  const [uniqueUsers, setUniqueUsers] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  
  const [chartFilter, setChartFilter] = useState<ChartFilter>('today');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>('all');
  const [acquirerCostFilter, setAcquirerCostFilter] = useState<AcquirerCostFilter>('thisMonth');
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [goalInput, setGoalInput] = useState<string>('');
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);

  useEffect(() => {
    loadAllData();
    loadMonthlyGoal();
  }, []);

  // Recarregar stats quando usuário mudar
  useEffect(() => {
    loadStats();
    loadChartData();
  }, [selectedUser]);

  // Recarregar gráfico quando filtro mudar
  useEffect(() => {
    loadChartData();
  }, [chartFilter]);

  // Recarregar ranking quando filtro mudar
  useEffect(() => {
    loadRanking();
  }, [rankingFilter]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadChartData(),
        loadRanking(),
        loadUniqueUsers()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_platform_revenue_stats', {
        p_user_email: selectedUser === 'all' ? null : selectedUser
      });
      if (error) throw error;
      
      if (data) {
        const stats: ProfitStats = { ...defaultProfitStats };
        
        // Cast to expected structure
        const rpcData = data as {
          today?: { net_profit: number; gross_revenue: number; acquirer_cost: number; transaction_count: number };
          week?: { net_profit: number; gross_revenue: number; acquirer_cost: number };
          fortnight?: { net_profit: number; gross_revenue: number; acquirer_cost: number };
          month?: { net_profit: number; gross_revenue: number; acquirer_cost: number };
          last_month?: { net_profit: number; gross_revenue: number; acquirer_cost: number };
          year?: { net_profit: number; gross_revenue: number; acquirer_cost: number };
          all_time?: { net_profit: number; gross_revenue: number; acquirer_cost: number; transaction_count: number };
          acquirer_breakdown?: {
            [key: string]: {
              today: { count: number; cost: number; volume: number };
              sevenDays: { count: number; cost: number; volume: number };
              thisMonth: { count: number; cost: number; volume: number };
              total: { count: number; cost: number; volume: number };
            };
          };
        };
        
        // Process JSON object structure from RPC
        if (rpcData.today) {
          stats.today = Number(rpcData.today.net_profit) || 0;
          stats.gross.today = Number(rpcData.today.gross_revenue) || 0;
          stats.acquirerCosts.today = Number(rpcData.today.acquirer_cost) || 0;
        }
        if (rpcData.week) {
          stats.sevenDays = Number(rpcData.week.net_profit) || 0;
          stats.gross.sevenDays = Number(rpcData.week.gross_revenue) || 0;
          stats.acquirerCosts.sevenDays = Number(rpcData.week.acquirer_cost) || 0;
        }
        if (rpcData.fortnight) {
          stats.fifteenDays = Number(rpcData.fortnight.net_profit) || 0;
          stats.gross.fifteenDays = Number(rpcData.fortnight.gross_revenue) || 0;
          stats.acquirerCosts.fifteenDays = Number(rpcData.fortnight.acquirer_cost) || 0;
        }
        if (rpcData.month) {
          stats.thisMonth = Number(rpcData.month.net_profit) || 0;
          stats.gross.thisMonth = Number(rpcData.month.gross_revenue) || 0;
          stats.acquirerCosts.thisMonth = Number(rpcData.month.acquirer_cost) || 0;
        }
        if (rpcData.last_month) {
          stats.lastMonth = Number(rpcData.last_month.net_profit) || 0;
          stats.gross.lastMonth = Number(rpcData.last_month.gross_revenue) || 0;
          stats.acquirerCosts.lastMonth = Number(rpcData.last_month.acquirer_cost) || 0;
        }
        if (rpcData.year) {
          stats.thisYear = Number(rpcData.year.net_profit) || 0;
          stats.gross.thisYear = Number(rpcData.year.gross_revenue) || 0;
          stats.acquirerCosts.thisYear = Number(rpcData.year.acquirer_cost) || 0;
        }
        if (rpcData.all_time) {
          stats.total = Number(rpcData.all_time.net_profit) || 0;
          stats.gross.total = Number(rpcData.all_time.gross_revenue) || 0;
          stats.acquirerCosts.total = Number(rpcData.all_time.acquirer_cost) || 0;
          stats.transactionCount = Number(rpcData.all_time.transaction_count) || 0;
        }
        
        // Process acquirer breakdown - map to expected structure
        if (rpcData.acquirer_breakdown) {
          const rawBreakdown = rpcData.acquirer_breakdown as unknown as {
            [key: string]: { today: number; sevenDays: number; thisMonth: number; total: number };
          };
          const breakdown: ProfitStats['acquirerBreakdown'] = {};
          for (const [acq, costs] of Object.entries(rawBreakdown)) {
            breakdown[acq] = {
              today: { count: 0, cost: Number(costs.today) || 0, volume: 0 },
              sevenDays: { count: 0, cost: Number(costs.sevenDays) || 0, volume: 0 },
              thisMonth: { count: 0, cost: Number(costs.thisMonth) || 0, volume: 0 },
              total: { count: 0, cost: Number(costs.total) || 0, volume: 0 }
            };
          }
          stats.acquirerBreakdown = breakdown;
        }
        
        // Calculate derived stats
        stats.averageProfit = stats.transactionCount > 0 ? stats.total / stats.transactionCount : 0;
        stats.daysWithData = stats.sevenDays > 0 ? 7 : 0;
        stats.averageDailyProfit = stats.daysWithData > 0 ? stats.sevenDays / 7 : 0;
        stats.monthlyProjection = stats.averageDailyProfit * 30;
        
        // Calculate month over month change
        if (stats.lastMonth > 0) {
          stats.monthOverMonthChange = ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100;
        }
        
        setProfitStats(stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadChartData = async () => {
    setIsChartLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_platform_revenue_chart', {
        p_filter: chartFilter,
        p_user_email: selectedUser === 'all' ? null : selectedUser
      });
      if (error) throw error;
      // Transform RPC response: date -> date, net_profit -> lucro
      const rawData = data as unknown as Array<{ date: string; net_profit: number }> | null;
      const transformed: ChartData[] = rawData?.map(row => ({
        date: row.date,
        lucro: Number(row.net_profit) || 0
      })) || [];
      setChartData(transformed);
    } catch (error) {
      console.error('Error loading chart:', error);
    } finally {
      setIsChartLoading(false);
    }
  };

  const loadRanking = async () => {
    setIsRankingLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_platform_user_profit_ranking', {
        p_filter: rankingFilter,
        p_limit: 10
      });
      if (error) throw error;
      // Transform RPC response: user_email -> email, calculate average_profit
      const rawData = data as unknown as Array<{ 
        user_email: string; 
        total_profit: number; 
        transaction_count: number 
      }> | null;
      const transformed: UserProfitRanking[] = rawData?.map(row => ({
        email: row.user_email,
        total_profit: Number(row.total_profit) || 0,
        transaction_count: Number(row.transaction_count) || 0,
        average_profit: row.transaction_count > 0 
          ? Number(row.total_profit) / Number(row.transaction_count) 
          : 0
      })) || [];
      setUserProfitRanking(transformed);
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setIsRankingLoading(false);
    }
  };

  const loadUniqueUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_platform_unique_users');
      if (error) throw error;
      // RPC returns [{user_email: "..."}], extract email strings
      const rawData = data as unknown as Array<{ user_email: string }> | null;
      const emails = rawData?.map((row) => row.user_email).filter(Boolean) || [];
      setUniqueUsers(emails);
    } catch (error) {
      console.error('Error loading users:', error);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Filtrar usuários baseado na busca
  const filteredUsers = userSearchQuery.trim()
    ? uniqueUsers.filter(email => email.toLowerCase().includes(userSearchQuery.toLowerCase()))
    : uniqueUsers;

  // Helper para obter dados do período selecionado do acquirerBreakdown
  const getAcquirerPeriodKey = () => {
    if (acquirerCostFilter === '7days') return 'sevenDays';
    return acquirerCostFilter;
  };

  const getAcquirerPeriodLabel = () => {
    switch(acquirerCostFilter) {
      case 'today': return 'Hoje';
      case '7days': return '7 dias';
      case 'thisMonth': return 'Este mês';
    }
  };

  const periodKey = getAcquirerPeriodKey();
  const breakdown = profitStats.acquirerBreakdown || {};
  const spedpayData = breakdown.spedpay?.[periodKey] || { count: 0, cost: 0, volume: 0 };
  const interData = breakdown.inter?.[periodKey] || { count: 0, cost: 0, volume: 0 };
  const ativusData = breakdown.ativus?.[periodKey] || { count: 0, cost: 0, volume: 0 };
  const valorionData = breakdown.valorion?.[periodKey] || { count: 0, cost: 0, volume: 0 };
  const totalCost = spedpayData.cost + interData.cost + ativusData.cost + valorionData.cost;
  const totalCount = spedpayData.count + interData.count + ativusData.count + valorionData.count;
  const avgCost = totalCount > 0 ? totalCost / totalCount : 0;

  const hasAcquirerData = (breakdown.spedpay?.total?.count || 0) > 0 || 
    (breakdown.inter?.total?.count || 0) > 0 || 
    (breakdown.ativus?.total?.count || 0) > 0 ||
    (breakdown.valorion?.total?.count || 0) > 0;

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
              onClick={loadAllData} 
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
              <p className="text-[10px] text-muted-foreground">(VALORION, Inter, Ativus, Valorion)</p>
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
      {hasAcquirerData && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Custos por Adquirente ({getAcquirerPeriodLabel()})
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
            {/* Layout SpedPay Style - Cards + Barras Horizontais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lado Esquerdo - Cards em Grid */}
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Visão geral por adquirente
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'VALORION', data: spedpayData, color: '#3B82F6', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
                    { name: 'BANCO INTER', data: interData, color: '#F97316', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
                    { name: 'ATIVUS HUB', data: ativusData, color: '#10B981', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
                    { name: 'VALORION 2', data: valorionData, color: '#8B5CF6', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' }
                  ]
                    .sort((a, b) => b.data.volume - a.data.volume)
                    .map((acq, index) => {
                      const totalVolume = spedpayData.volume + interData.volume + ativusData.volume + valorionData.volume;
                      const percentage = totalVolume > 0 ? ((acq.data.volume / totalVolume) * 100).toFixed(1) : '0';
                      const netRevenue = acq.data.volume - acq.data.cost;
                      
                      return (
                        <div 
                          key={index} 
                          className={`border rounded-lg p-3 ${acq.bgColor} ${acq.borderColor} transition-all hover:shadow-md`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-xs text-foreground">{acq.name}</span>
                            <span 
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${acq.color}20`, color: acq.color }}
                            >
                              {percentage}%
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Faturamento</span>
                              <span className="text-xs font-medium text-foreground">{formatCurrency(acq.data.volume)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Receita líquida</span>
                              <span className="text-xs font-medium text-green-600">{formatCurrency(netRevenue)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Transações</span>
                              <span className="text-xs font-medium text-foreground">{acq.data.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {/* Resumo Total */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <div className="text-sm font-bold text-foreground">{formatCurrency(totalCost)}</div>
                    <p className="text-[10px] text-muted-foreground">Custo Total</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <div className="text-sm font-bold text-foreground">{totalCount}</div>
                    <p className="text-[10px] text-muted-foreground">Transações</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <div className="text-sm font-bold text-foreground">{formatCurrency(avgCost)}</div>
                    <p className="text-[10px] text-muted-foreground">Custo Médio</p>
                  </div>
                </div>
              </div>
              
              {/* Lado Direito - Barras Horizontais */}
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Distribuição percentual do faturamento
                </p>
                <div className="space-y-4">
                  {(() => {
                    const totalVolume = spedpayData.volume + interData.volume + ativusData.volume + valorionData.volume;
                    const acquirers = [
                      { name: 'SpedPay', data: spedpayData, color: '#3B82F6' },
                      { name: 'Banco Inter', data: interData, color: '#F97316' },
                      { name: 'Ativus Hub', data: ativusData, color: '#10B981' },
                      { name: 'Valorion', data: valorionData, color: '#8B5CF6' }
                    ]
                      .sort((a, b) => b.data.volume - a.data.volume);
                    
                    return acquirers.map((acq, index) => {
                      const percentage = totalVolume > 0 ? (acq.data.volume / totalVolume) * 100 : 0;
                      
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-sm" 
                                style={{ backgroundColor: acq.color }}
                              />
                              <span className="text-sm font-medium text-foreground">{acq.name}</span>
                            </div>
                            <span className="text-sm font-bold text-foreground">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${percentage}%`, 
                                backgroundColor: acq.color 
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{formatCurrency(acq.data.volume)}</span>
                            <span>{acq.data.count} transações</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Evolução do Lucro */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            Evolução do Lucro
          </CardTitle>
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
        </CardHeader>
        <CardContent>
          {isChartLoading ? (
            <div className="flex items-center justify-center h-[280px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
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
            </>
          )}
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
                profitStats.monthOverMonthChange > 0 ? "text-green-500" : profitStats.monthOverMonthChange < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {profitStats.monthOverMonthChange > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : profitStats.monthOverMonthChange < 0 ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : null}
                {Math.abs(profitStats.monthOverMonthChange).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Tendência</p>
              <p className="text-xs text-muted-foreground">
                {profitStats.monthOverMonthChange > 0 ? "em alta" : profitStats.monthOverMonthChange < 0 ? "em queda" : "estável"}
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
          {isRankingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userProfitRanking.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma transação paga encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[50px]">#</TableHead>
                    <TableHead className="text-xs">Usuário</TableHead>
                    <TableHead className="text-xs text-right">Transações</TableHead>
                    <TableHead className="text-xs text-right">Lucro Total</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProfitRanking.map((user, index) => (
                    <TableRow key={user.email}>
                      <TableCell className="text-xs">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                          index === 1 ? "bg-gray-300/20 text-gray-400" :
                          index === 2 ? "bg-orange-500/20 text-orange-500" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[200px] truncate">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-xs text-right">{user.transaction_count}</TableCell>
                      <TableCell className="text-xs text-right font-semibold text-green-500">
                        {formatCurrency(user.total_profit)}
                      </TableCell>
                      <TableCell className="text-xs text-right hidden sm:table-cell">
                        {formatCurrency(user.average_profit)}
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
