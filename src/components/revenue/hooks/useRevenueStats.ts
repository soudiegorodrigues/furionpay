import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProfitStats, DEFAULT_PROFIT_STATS, RankingFilter, ChartData, UserProfitRanking } from '../types';
import { toast } from 'sonner';

export function useRevenueStats() {
  const [profitStats, setProfitStats] = useState<ProfitStats>(DEFAULT_PROFIT_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_platform_revenue_stats', {
        p_user_email: null
      });
      if (error) throw error;
      
      if (data) {
        const stats: ProfitStats = { ...DEFAULT_PROFIT_STATS };
        
        const rpcData = data as {
          today?: { net_profit: number; gross_revenue: number; percentage_revenue?: number; fixed_revenue?: number; pix_cost?: number; withdrawal_fees?: number; transaction_count: number };
          week?: { net_profit: number; gross_revenue: number; percentage_revenue?: number; fixed_revenue?: number; pix_cost?: number; withdrawal_fees?: number };
          fortnight?: { net_profit: number; gross_revenue: number; percentage_revenue?: number; fixed_revenue?: number; pix_cost?: number; withdrawal_fees?: number };
          month?: { net_profit: number; gross_revenue: number; percentage_revenue?: number; fixed_revenue?: number; pix_cost?: number; withdrawal_fees?: number };
          last_month?: { net_profit: number; gross_revenue: number; percentage_revenue?: number; fixed_revenue?: number; pix_cost?: number; withdrawal_fees?: number };
          year?: { net_profit: number; gross_revenue: number; percentage_revenue?: number; fixed_revenue?: number; pix_cost?: number; withdrawal_fees?: number };
          all_time?: { net_profit: number; gross_revenue: number; percentage_revenue?: number; fixed_revenue?: number; pix_cost?: number; withdrawal_fees?: number; transaction_count: number };
          acquirer_breakdown?: {
            [key: string]: {
              today: { count: number; cost: number; volume: number };
              sevenDays: { count: number; cost: number; volume: number };
              thisMonth: { count: number; cost: number; volume: number };
              total: { count: number; cost: number; volume: number };
            };
          };
        };
        
        // Process periods
        if (rpcData.today) {
          stats.today = Number(rpcData.today.net_profit) || 0;
          stats.gross.today = Number(rpcData.today.gross_revenue) || 0;
          stats.percentageRevenue.today = Number(rpcData.today.percentage_revenue) || 0;
          stats.fixedRevenue.today = Number(rpcData.today.fixed_revenue) || 0;
          stats.pixCosts.today = Number(rpcData.today.pix_cost) || 0;
          stats.withdrawalFees.today = Number(rpcData.today.withdrawal_fees) || 0;
          stats.acquirerCosts.today = stats.pixCosts.today;
        }
        if (rpcData.week) {
          stats.sevenDays = Number(rpcData.week.net_profit) || 0;
          stats.gross.sevenDays = Number(rpcData.week.gross_revenue) || 0;
          stats.percentageRevenue.sevenDays = Number(rpcData.week.percentage_revenue) || 0;
          stats.fixedRevenue.sevenDays = Number(rpcData.week.fixed_revenue) || 0;
          stats.pixCosts.sevenDays = Number(rpcData.week.pix_cost) || 0;
          stats.withdrawalFees.sevenDays = Number(rpcData.week.withdrawal_fees) || 0;
          stats.acquirerCosts.sevenDays = stats.pixCosts.sevenDays;
        }
        if (rpcData.fortnight) {
          stats.fifteenDays = Number(rpcData.fortnight.net_profit) || 0;
          stats.gross.fifteenDays = Number(rpcData.fortnight.gross_revenue) || 0;
          stats.percentageRevenue.fifteenDays = Number(rpcData.fortnight.percentage_revenue) || 0;
          stats.fixedRevenue.fifteenDays = Number(rpcData.fortnight.fixed_revenue) || 0;
          stats.pixCosts.fifteenDays = Number(rpcData.fortnight.pix_cost) || 0;
          stats.withdrawalFees.fifteenDays = Number(rpcData.fortnight.withdrawal_fees) || 0;
          stats.acquirerCosts.fifteenDays = stats.pixCosts.fifteenDays;
        }
        if (rpcData.month) {
          stats.thisMonth = Number(rpcData.month.net_profit) || 0;
          stats.gross.thisMonth = Number(rpcData.month.gross_revenue) || 0;
          stats.percentageRevenue.thisMonth = Number(rpcData.month.percentage_revenue) || 0;
          stats.fixedRevenue.thisMonth = Number(rpcData.month.fixed_revenue) || 0;
          stats.pixCosts.thisMonth = Number(rpcData.month.pix_cost) || 0;
          stats.withdrawalFees.thisMonth = Number(rpcData.month.withdrawal_fees) || 0;
          stats.acquirerCosts.thisMonth = stats.pixCosts.thisMonth;
        }
        if (rpcData.last_month) {
          stats.lastMonth = Number(rpcData.last_month.net_profit) || 0;
          stats.gross.lastMonth = Number(rpcData.last_month.gross_revenue) || 0;
          stats.percentageRevenue.lastMonth = Number(rpcData.last_month.percentage_revenue) || 0;
          stats.fixedRevenue.lastMonth = Number(rpcData.last_month.fixed_revenue) || 0;
          stats.pixCosts.lastMonth = Number(rpcData.last_month.pix_cost) || 0;
          stats.withdrawalFees.lastMonth = Number(rpcData.last_month.withdrawal_fees) || 0;
          stats.acquirerCosts.lastMonth = stats.pixCosts.lastMonth;
        }
        if (rpcData.year) {
          stats.thisYear = Number(rpcData.year.net_profit) || 0;
          stats.gross.thisYear = Number(rpcData.year.gross_revenue) || 0;
          stats.percentageRevenue.thisYear = Number(rpcData.year.percentage_revenue) || 0;
          stats.fixedRevenue.thisYear = Number(rpcData.year.fixed_revenue) || 0;
          stats.pixCosts.thisYear = Number(rpcData.year.pix_cost) || 0;
          stats.withdrawalFees.thisYear = Number(rpcData.year.withdrawal_fees) || 0;
          stats.acquirerCosts.thisYear = stats.pixCosts.thisYear;
        }
        if (rpcData.all_time) {
          stats.total = Number(rpcData.all_time.net_profit) || 0;
          stats.gross.total = Number(rpcData.all_time.gross_revenue) || 0;
          stats.percentageRevenue.total = Number(rpcData.all_time.percentage_revenue) || 0;
          stats.fixedRevenue.total = Number(rpcData.all_time.fixed_revenue) || 0;
          stats.pixCosts.total = Number(rpcData.all_time.pix_cost) || 0;
          stats.withdrawalFees.total = Number(rpcData.all_time.withdrawal_fees) || 0;
          stats.acquirerCosts.total = stats.pixCosts.total;
          stats.transactionCount = Number(rpcData.all_time.transaction_count) || 0;
        }
        
        // Process acquirer breakdown
        if (rpcData.acquirer_breakdown) {
          const breakdown: ProfitStats['acquirerBreakdown'] = {};
          for (const [acq, rawValue] of Object.entries(rpcData.acquirer_breakdown)) {
            const vAny = rawValue as any;
            const normalize = (key: 'today' | 'sevenDays' | 'thisMonth' | 'total') => {
              const val = vAny?.[key];
              if (typeof val === 'number') return { count: 0, cost: Number(val) || 0, volume: 0 };
              return {
                count: Number(val?.count) || 0,
                cost: Number(val?.cost) || 0,
                volume: Number(val?.volume) || 0,
              };
            };
            breakdown[acq] = {
              today: normalize('today'),
              sevenDays: normalize('sevenDays'),
              thisMonth: normalize('thisMonth'),
              total: normalize('total'),
            };
          }
          stats.acquirerBreakdown = breakdown;
        }
        
        // Calculate derived stats
        stats.averageProfit = stats.transactionCount > 0 ? stats.total / stats.transactionCount : 0;
        stats.daysWithData = stats.sevenDays > 0 ? 7 : 0;
        stats.averageDailyProfit = stats.daysWithData > 0 ? stats.sevenDays / 7 : 0;
        stats.monthlyProjection = stats.averageDailyProfit * 30;
        
        if (stats.lastMonth > 0) {
          stats.monthOverMonthChange = ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100;
        }
        
        setProfitStats(stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadMonthlyGoal = useCallback(async () => {
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
  }, []);

  const saveMonthlyGoal = useCallback(async (newGoal: number) => {
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'monthly_profit_goal',
        setting_value: newGoal.toString()
      });
      if (error) throw error;
      setMonthlyGoal(newGoal);
      toast.success('Meta mensal atualizada com sucesso!');
      return true;
    } catch (error) {
      console.error('Error saving monthly goal:', error);
      toast.error('Erro ao salvar meta mensal');
      return false;
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadStats(), loadMonthlyGoal()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadStats, loadMonthlyGoal]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    profitStats,
    isLoading,
    monthlyGoal,
    loadAllData,
    saveMonthlyGoal,
  };
}

export function useRevenueChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_platform_revenue_chart_monthly', {
        p_user_email: null
      });
      if (error) throw error;
      const rawData = data as unknown as Array<{ month_name: string; month_number: number; lucro: number }> | null;
      const transformed: ChartData[] = rawData?.map(row => ({
        date: row.month_name,
        lucro: Number(row.lucro) || 0
      })) || [];
      setChartData(transformed);
    } catch (error) {
      console.error('Error loading chart:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  return {
    chartData,
    isLoading,
    refresh: loadChartData,
  };
}

export function useUserRanking(initialFilter: RankingFilter = 'all') {
  const [ranking, setRanking] = useState<UserProfitRanking[]>([]);
  const [filter, setFilter] = useState<RankingFilter>(initialFilter);
  const [isLoading, setIsLoading] = useState(false);

  const loadRanking = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_platform_user_profit_ranking', {
        p_filter: filter,
        p_limit: 10
      });
      if (error) throw error;
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
      setRanking(transformed);
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  return {
    ranking,
    filter,
    setFilter,
    isLoading,
    refresh: loadRanking,
  };
}
