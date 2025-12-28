import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import { ProfitStats, AcquirerCostFilter, ACQUIRER_COLORS, ACQUIRER_COSTS_PER_TX } from '../types';
import { formatCurrency, getAcquirerPeriodKey, getAcquirerPeriodLabel } from '../utils';
import { AcquirerSkeleton } from '../skeletons/KPICardSkeleton';
import { cn } from '@/lib/utils';

interface AcquirerAnalysisProps {
  stats: ProfitStats;
  isLoading: boolean;
  globalFilter: AcquirerCostFilter;
}

export const AcquirerAnalysis = memo(({ stats, isLoading, globalFilter }: AcquirerAnalysisProps) => {
  const periodKey = getAcquirerPeriodKey(globalFilter);
  const breakdown = stats.acquirerBreakdown || {};
  
  const acquirerData = useMemo(() => {
    const inter = breakdown.inter?.[periodKey] || { count: 0, cost: 0, volume: 0 };
    const ativus = breakdown.ativus?.[periodKey] || { count: 0, cost: 0, volume: 0 };
    const valorion = breakdown.valorion?.[periodKey] || { count: 0, cost: 0, volume: 0 };
    
    const totalCost = inter.cost + ativus.cost + valorion.cost;
    const totalCount = inter.count + ativus.count + valorion.count;
    const totalVolume = inter.volume + ativus.volume + valorion.volume;
    
    const acquirers = [
      { 
        name: 'VALORION', 
        key: 'valorion' as const,
        data: valorion,
        ...ACQUIRER_COLORS.valorion,
        costPerTx: ACQUIRER_COSTS_PER_TX.valorion,
      },
      { 
        name: 'BANCO INTER', 
        key: 'inter' as const,
        data: inter,
        ...ACQUIRER_COLORS.inter,
        costPerTx: ACQUIRER_COSTS_PER_TX.inter,
      },
      { 
        name: 'ATIVUS HUB', 
        key: 'ativus' as const,
        data: ativus,
        ...ACQUIRER_COLORS.ativus,
        costPerTx: ACQUIRER_COSTS_PER_TX.ativus,
      },
    ].sort((a, b) => b.data.volume - a.data.volume);
    
    return { acquirers, totalCost, totalCount, totalVolume };
  }, [breakdown, periodKey]);

  const hasData = acquirerData.totalCount > 0 || acquirerData.totalCost > 0;

  if (!hasData && !isLoading) return null;

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
            <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
              <PieChartIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <span className="hidden sm:inline">Faturamento por Adquirente</span>
            <span className="sm:hidden">Por Adquirente</span>
            <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">
              ({getAcquirerPeriodLabel(globalFilter)})
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <AcquirerSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left - Acquirer Cards */}
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3 font-medium">
                Volume por adquirente
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {acquirerData.acquirers.map((acq) => {
                  const percentage = acquirerData.totalVolume > 0 
                    ? ((acq.data.volume / acquirerData.totalVolume) * 100).toFixed(1) 
                    : '0';
                  const netRevenue = acq.data.volume - acq.data.cost;
                  
                  return (
                    <div 
                      key={acq.key}
                      className={cn(
                        "border rounded-xl p-2.5 sm:p-4 transition-all duration-200 hover:shadow-md",
                        acq.bgColor,
                        acq.borderColor
                      )}
                    >
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <span className="font-bold text-[10px] sm:text-xs text-foreground">{acq.name}</span>
                        <span 
                          className="text-[9px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${acq.color}20`, color: acq.color }}
                        >
                          {percentage}%
                        </span>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] sm:text-xs text-muted-foreground">Volume</span>
                          <span className="text-[10px] sm:text-xs font-bold text-foreground">
                            {formatCurrency(acq.data.volume)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] sm:text-xs text-muted-foreground">Líquido</span>
                          <span className="text-[10px] sm:text-xs font-bold text-emerald-500">
                            {formatCurrency(netRevenue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] sm:text-xs text-muted-foreground">Custo</span>
                          <span className="text-[10px] sm:text-xs font-medium text-red-500">
                            -{formatCurrency(acq.data.cost)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] sm:text-xs text-muted-foreground">Tx</span>
                          <span className="text-[10px] sm:text-xs font-medium text-foreground">
                            {acq.data.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Cost Summary */}
              <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className="text-center p-2 sm:p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-xs sm:text-sm font-bold text-red-500">
                    {formatCurrency(acquirerData.totalCost)}
                  </div>
                  <p className="text-[8px] sm:text-[10px] text-muted-foreground">Custo Total</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs sm:text-sm font-bold text-foreground">
                    {acquirerData.totalCount}
                  </div>
                  <p className="text-[8px] sm:text-[10px] text-muted-foreground">Transações</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs sm:text-sm font-bold text-foreground">
                    {formatCurrency(acquirerData.totalCount > 0 ? acquirerData.totalCost / acquirerData.totalCount : 0)}
                  </div>
                  <p className="text-[8px] sm:text-[10px] text-muted-foreground">Custo/Tx</p>
                </div>
              </div>
            </div>
            
            {/* Right - Cost Distribution Bars */}
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3 font-medium">
                Distribuição de custos
              </p>
              <div className="space-y-3 sm:space-y-4">
                {acquirerData.acquirers
                  .sort((a, b) => b.data.cost - a.data.cost)
                  .map((acq) => {
                    const percentage = acquirerData.totalCost > 0 
                      ? (acq.data.cost / acquirerData.totalCost) * 100 
                      : 0;
                    
                    return (
                      <div key={acq.key} className="space-y-1 sm:space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div 
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" 
                              style={{ backgroundColor: acq.color }}
                            />
                            <span className="text-xs sm:text-sm font-medium text-foreground">
                              {acq.name}
                            </span>
                            <span className="text-[8px] sm:text-[10px] text-muted-foreground hidden sm:inline">
                              ({formatCurrency(acq.costPerTx)}/tx)
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-red-500">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 sm:h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500 bg-red-500"
                            style={{ 
                              width: `${percentage}%`,
                              opacity: 0.7 + (percentage / 100) * 0.3
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] sm:text-[10px] text-muted-foreground">
                          <span className="text-red-500 font-medium">
                            {formatCurrency(acq.data.cost)}
                          </span>
                          <span>{acq.data.count} tx</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {/* Insight */}
              {acquirerData.totalCost > 0 && (
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    💡 <strong>Insight:</strong> Se todas as tx fossem pelo Banco Inter, 
                    economia de <span className="text-emerald-500 font-semibold">
                      {formatCurrency(acquirerData.totalCost)}
                    </span>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AcquirerAnalysis.displayName = 'AcquirerAnalysis';
