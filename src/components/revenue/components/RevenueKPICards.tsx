import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wallet, RefreshCw, TrendingUp, TrendingDown, HelpCircle, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';
import { ProfitStats, GlobalPeriodFilter, getGlobalPeriodLabel } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { KPICardSkeleton } from '../skeletons/KPICardSkeleton';
import { cn } from '@/lib/utils';

interface RevenueKPICardsProps {
  stats: ProfitStats;
  isLoading: boolean;
  onRefresh: () => void;
  globalFilter: GlobalPeriodFilter;
}

interface KPICardProps {
  value: number;
  label: string;
  sublabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'highlight';
  tooltip?: string;
  trend?: number;
}

const KPICard = memo(({ value, label, sublabel, variant = 'default', tooltip, trend }: KPICardProps) => {
  const variantClasses = {
    default: 'bg-muted/30 border-border/50',
    primary: 'bg-primary/10 border-primary/30',
    success: 'bg-emerald-500/10 border-emerald-500/30',
    highlight: 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border-emerald-500/40',
  };

  const valueClasses = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-emerald-500',
    highlight: 'text-emerald-500',
  };

  const content = (
    <div 
      className={cn(
        "text-center p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
        variantClasses[variant]
      )}
    >
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1">
        <div className={cn("text-base sm:text-xl font-bold", valueClasses[variant])}>
          {formatCurrency(value)}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn(
            "flex items-center text-[10px] sm:text-xs font-medium",
            trend > 0 ? "text-emerald-500" : "text-red-500"
          )}>
            {trend > 0 ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            <span className="ml-0.5">{formatPercent(Math.abs(trend), false)}</span>
          </div>
        )}
      </div>
      <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
      {sublabel && (
        <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-0.5">{sublabel}</p>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help relative">
              {content}
              <HelpCircle className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
});

KPICard.displayName = 'KPICard';

const REVENUE_COLORS = {
  taxaPercentual: '#10B981',
  valorFixo: '#06B6D4',
  taxaSaque: '#3B82F6',
  custoPix: '#EF4444',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm">{data.name}</p>
        <p className="text-sm" style={{ color: data.color }}>
          {formatCurrency(data.value)}
        </p>
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
        )}
      </div>
    );
  }
  return null;
};

// Helper to get the profit value for a given period
const getProfitForPeriod = (stats: ProfitStats, period: GlobalPeriodFilter): number => {
  const map: Record<GlobalPeriodFilter, number> = {
    today: stats.today,
    sevenDays: stats.sevenDays,
    fifteenDays: stats.fifteenDays,
    thisMonth: stats.thisMonth,
    thisYear: stats.thisYear,
    total: stats.total,
  };
  return map[period];
};

// Helper to get percentage revenue for a given period
const getPercentageRevenueForPeriod = (stats: ProfitStats, period: GlobalPeriodFilter): number => {
  return stats.percentageRevenue[period] || 0;
};

// Helper to get fixed revenue for a given period
const getFixedRevenueForPeriod = (stats: ProfitStats, period: GlobalPeriodFilter): number => {
  return stats.fixedRevenue[period] || 0;
};

// Helper to get withdrawal fees for a given period
const getWithdrawalFeesForPeriod = (stats: ProfitStats, period: GlobalPeriodFilter): number => {
  return stats.withdrawalFees[period] || 0;
};

export const RevenueKPICards = memo(({ stats, isLoading, onRefresh, globalFilter }: RevenueKPICardsProps) => {
  const periodLabel = getGlobalPeriodLabel(globalFilter);
  const currentProfit = getProfitForPeriod(stats, globalFilter);
  
  const revenueBreakdownData = useMemo(() => {
    return [
      { 
        name: 'Valor taxas', 
        value: getPercentageRevenueForPeriod(stats, globalFilter), 
        color: REVENUE_COLORS.taxaPercentual,
        description: 'Receita de taxas percentuais (ex: 4.99%)'
      },
      { 
        name: 'Valor Fixo', 
        value: getFixedRevenueForPeriod(stats, globalFilter), 
        color: REVENUE_COLORS.valorFixo,
        description: 'Receita de valores fixos por transação'
      },
      { 
        name: 'Taxa Saque', 
        value: getWithdrawalFeesForPeriod(stats, globalFilter), 
        color: REVENUE_COLORS.taxaSaque,
        description: 'Taxas cobradas sobre saques'
      },
    ].filter(item => item.value !== 0);
  }, [stats, globalFilter]);

  const maxValue = useMemo(() => {
    return Math.max(...revenueBreakdownData.map(d => d.value), 1);
  }, [revenueBreakdownData]);

  // Determine trend based on period
  const showTrend = globalFilter === 'thisMonth' && stats.monthOverMonthChange !== 0;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-4 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <span className="hidden xs:inline">Receita da Plataforma</span>
          <span className="xs:hidden">Receita</span>
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh} 
          disabled={isLoading}
          className="h-8 sm:h-9 px-2 sm:px-3"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2", isLoading && "animate-spin")} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
        {isLoading ? (
          <KPICardSkeleton count={1} />
        ) : (
          <>
            {/* Single KPI Card for selected period */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <KPICard 
                  value={currentProfit} 
                  label={`Lucro Líquido - ${periodLabel}`}
                  variant="highlight"
                  tooltip={`Lucro líquido para o período: ${periodLabel}`}
                  trend={showTrend ? stats.monthOverMonthChange : undefined}
                />
              </div>
            </div>

            {/* Revenue Composition Chart */}
            {revenueBreakdownData.length > 0 && (
              <div className="pt-3 sm:pt-4 border-t border-border/50">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <h4 className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                    <span className="hidden sm:inline">Composição da Receita ({periodLabel})</span>
                    <span className="sm:hidden">Composição ({periodLabel})</span>
                  </h4>
                </div>
                <div className="h-24 sm:h-32 md:h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueBreakdownData}
                      layout="vertical"
                      margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
                    >
                      <XAxis 
                        type="number" 
                        hide 
                        domain={[0, maxValue * 1.1]}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        width={55}
                      />
                      <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                        background={false}
                      >
                        {revenueBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(value: number) => formatCurrency(value)}
                          style={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

RevenueKPICards.displayName = 'RevenueKPICards';
