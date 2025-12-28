import { useState, useMemo } from 'react';
import { useRevenueStats, useRevenueChart, useUserRanking } from './hooks/useRevenueStats';
import { RevenueFilters } from './components/RevenueFilters';
import { RevenueKPICards } from './components/RevenueKPICards';
import { RevenueBreakdown } from './components/RevenueBreakdown';
import { AcquirerAnalysis } from './components/AcquirerAnalysis';
import { RevenueChart } from './components/RevenueChart';
import { GeneralStats } from './components/GeneralStats';
import { UserRanking } from './components/UserRanking';
import { GlobalPeriodFilter, globalToRankingFilter, globalToAcquirerFilter } from './types';

export function RevenueDashboard() {
  const [globalFilter, setGlobalFilter] = useState<GlobalPeriodFilter>('thisMonth');
  
  const { profitStats, isLoading, loadAllData } = useRevenueStats();
  const { chartData, isLoading: isChartLoading } = useRevenueChart();
  
  // Convert global filter to ranking filter for the hook
  const rankingFilter = useMemo(() => globalToRankingFilter(globalFilter), [globalFilter]);
  const { ranking, setFilter: setRankingFilter, isLoading: isRankingLoading } = useUserRanking(rankingFilter);
  
  // Convert global filter to acquirer filter
  const acquirerFilter = useMemo(() => globalToAcquirerFilter(globalFilter), [globalFilter]);

  // When global filter changes, update the ranking filter
  const handleFilterChange = (newFilter: GlobalPeriodFilter) => {
    setGlobalFilter(newFilter);
    setRankingFilter(globalToRankingFilter(newFilter));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Global Filter */}
      <RevenueFilters 
        filter={globalFilter} 
        onFilterChange={handleFilterChange} 
      />

      {/* KPI Cards */}
      <RevenueKPICards 
        stats={profitStats} 
        isLoading={isLoading} 
        onRefresh={loadAllData}
        globalFilter={globalFilter}
      />

      {/* Breakdown: Receita vs Custos */}
      <RevenueBreakdown 
        stats={profitStats} 
        isLoading={isLoading}
        globalFilter={globalFilter}
      />

      {/* Acquirer Analysis */}
      <AcquirerAnalysis 
        stats={profitStats} 
        isLoading={isLoading}
        globalFilter={acquirerFilter}
      />

      {/* Chart */}
      <RevenueChart 
        data={chartData}
        isLoading={isChartLoading}
      />

      {/* General Stats */}
      <GeneralStats stats={profitStats} />

      {/* User Ranking */}
      <UserRanking 
        ranking={ranking}
        isLoading={isRankingLoading}
        globalFilter={globalFilter}
      />
    </div>
  );
}
