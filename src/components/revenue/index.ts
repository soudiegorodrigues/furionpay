import { useRevenueStats, useRevenueChart, useUserRanking } from './hooks/useRevenueStats';
import { RevenueKPICards } from './components/RevenueKPICards';
import { RevenueBreakdown } from './components/RevenueBreakdown';
import { AcquirerAnalysis } from './components/AcquirerAnalysis';
import { RevenueChart } from './components/RevenueChart';
import { MonthlyGoalTracker } from './components/MonthlyGoalTracker';
import { MonthlyComparison } from './components/MonthlyComparison';
import { GeneralStats } from './components/GeneralStats';
import { UserRanking } from './components/UserRanking';

export function RevenueDashboard() {
  const { profitStats, isLoading, monthlyGoal, loadAllData, saveMonthlyGoal } = useRevenueStats();
  const { chartData, chartFilter, setChartFilter, isLoading: isChartLoading } = useRevenueChart();
  const { ranking, filter: rankingFilter, setFilter: setRankingFilter, isLoading: isRankingLoading } = useUserRanking();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* KPI Cards */}
      <RevenueKPICards 
        stats={profitStats} 
        isLoading={isLoading} 
        onRefresh={loadAllData} 
      />

      {/* Breakdown: Receita vs Custos */}
      <RevenueBreakdown 
        stats={profitStats} 
        isLoading={isLoading} 
      />

      {/* Acquirer Analysis */}
      <AcquirerAnalysis 
        stats={profitStats} 
        isLoading={isLoading} 
      />

      {/* Chart */}
      <RevenueChart 
        data={chartData}
        filter={chartFilter}
        onFilterChange={setChartFilter}
        isLoading={isChartLoading}
      />

      {/* Goal & Projection */}
      <MonthlyGoalTracker 
        stats={profitStats}
        monthlyGoal={monthlyGoal}
        onSaveGoal={saveMonthlyGoal}
      />

      {/* Monthly Comparison */}
      <MonthlyComparison stats={profitStats} />

      {/* General Stats */}
      <GeneralStats stats={profitStats} />

      {/* User Ranking */}
      <UserRanking 
        ranking={ranking}
        filter={rankingFilter}
        onFilterChange={setRankingFilter}
        isLoading={isRankingLoading}
      />
    </div>
  );
}

export { ReceitaPlataformaSection } from './ReceitaPlataformaSectionLegacy';
