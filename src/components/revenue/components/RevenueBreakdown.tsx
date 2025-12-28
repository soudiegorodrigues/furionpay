import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { ProfitStats, GlobalPeriodFilter, getGlobalPeriodLabel } from '../types';
import { formatCurrency, getMarginPercentage } from '../utils';
import { BreakdownSkeleton } from '../skeletons/KPICardSkeleton';
import { cn } from '@/lib/utils';

interface RevenueBreakdownProps {
  stats: ProfitStats;
  isLoading: boolean;
  globalFilter: GlobalPeriodFilter;
}

interface BreakdownItemProps {
  value: number;
  label: string;
  sublabel?: string;
  type: 'revenue' | 'cost' | 'profit' | 'neutral';
  tooltip?: string;
}

const BreakdownItem = memo(({ value, label, sublabel, type, tooltip }: BreakdownItemProps) => {
  const typeConfig = {
    revenue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-500',
      prefix: '',
    },
    cost: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-500',
      prefix: '-',
    },
    profit: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-500',
      prefix: '',
    },
    neutral: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-500',
      prefix: '+',
    },
  };

  const config = typeConfig[type];

  const content = (
    <div 
      className={cn(
        "text-center p-2.5 sm:p-4 rounded-xl border transition-all duration-200 hover:shadow-md",
        config.bg,
        config.border
      )}
    >
      <div className={cn("text-sm sm:text-lg font-bold", config.text)}>
        {config.prefix}{formatCurrency(value)}
      </div>
      <p className="text-[10px] sm:text-sm font-medium text-muted-foreground mt-0.5 sm:mt-1">{label}</p>
      {sublabel && (
        <p className="text-[9px] sm:text-xs text-muted-foreground/70 mt-0.5 hidden sm:block">{sublabel}</p>
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

BreakdownItem.displayName = 'BreakdownItem';

// Helper to get values for a given period
const getStatsForPeriod = (stats: ProfitStats, period: GlobalPeriodFilter) => {
  return {
    gross: stats.gross[period] || 0,
    acquirerCosts: stats.acquirerCosts[period] || 0,
    withdrawalFees: stats.withdrawalFees[period] || 0,
    netProfit: period === 'today' ? stats.today :
               period === 'sevenDays' ? stats.sevenDays :
               period === 'fifteenDays' ? stats.fifteenDays :
               period === 'thisMonth' ? stats.thisMonth :
               period === 'thisYear' ? stats.thisYear :
               stats.total,
  };
};

export const RevenueBreakdown = memo(({ stats, isLoading, globalFilter }: RevenueBreakdownProps) => {
  const periodLabel = getGlobalPeriodLabel(globalFilter);
  const periodStats = getStatsForPeriod(stats, globalFilter);
  
  const margin = getMarginPercentage(periodStats.netProfit, periodStats.gross);
  const marginTrend = margin >= 70 ? 'good' : margin >= 50 ? 'medium' : 'low';

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent shadow-sm">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
          <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/10">
            <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
          </div>
          <span className="hidden sm:inline">Breakdown: Receita vs Custos</span>
          <span className="sm:hidden">Receita vs Custos</span>
          <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-1">({periodLabel})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <BreakdownSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
              <BreakdownItem 
                value={periodStats.gross}
                label="Receita Bruta"
                sublabel="Taxas cobradas"
                type="revenue"
                tooltip="Total de taxas PIX cobradas dos usuários pelas transações aprovadas"
              />
              <BreakdownItem 
                value={periodStats.acquirerCosts}
                label="Custo PIX"
                sublabel="Pago aos adquirentes"
                type="cost"
                tooltip="Custo pago aos adquirentes (Valorion R$0.29/tx, Ativus R$0.05/tx, Inter R$0.00/tx)"
              />
              <BreakdownItem 
                value={periodStats.withdrawalFees}
                label="Receita Saques"
                sublabel="R$ 5,00/saque"
                type="neutral"
                tooltip="Taxa de R$ 5,00 cobrada por cada saque realizado pelos usuários"
              />
              <BreakdownItem 
                value={periodStats.netProfit}
                label="Lucro Líquido"
                sublabel="Taxas + Saques - Custos"
                type="profit"
                tooltip="Lucro final = Taxas PIX + Taxa Saques - Custo PIX"
              />
            </div>
            
            {/* Margin indicator */}
            {periodStats.gross > 0 && (
              <div className="flex items-center justify-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
                <span className="text-xs sm:text-sm text-muted-foreground">Margem:</span>
                <div className={cn(
                  "flex items-center gap-1 sm:gap-1.5 font-semibold text-sm sm:text-base",
                  marginTrend === 'good' ? 'text-emerald-500' : 
                  marginTrend === 'medium' ? 'text-amber-500' : 'text-red-500'
                )}>
                  {marginTrend === 'good' ? <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : 
                   marginTrend === 'low' ? <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : 
                   <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  {margin.toFixed(1)}%
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

RevenueBreakdown.displayName = 'RevenueBreakdown';
