import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ProfitStats } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { cn } from '@/lib/utils';

interface MonthlyComparisonProps {
  stats: ProfitStats;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthlyComparison = memo(({ stats }: MonthlyComparisonProps) => {
  const now = new Date();
  const currentMonth = MONTH_NAMES[now.getMonth()];
  const lastMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMonth = MONTH_NAMES[lastMonthIndex];
  
  const change = stats.monthOverMonthChange;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <GitCompare className="h-4 w-4 text-purple-500" />
          </div>
          Comparação Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {/* Last Month */}
          <div className="text-center p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">{lastMonth}</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(stats.lastMonth)}
            </p>
          </div>
          
          {/* Comparison Arrow */}
          <div className="flex flex-col items-center justify-center">
            <div className={cn(
              "p-2 rounded-full mb-1",
              trend === 'up' ? 'bg-emerald-500/10' :
              trend === 'down' ? 'bg-red-500/10' : 'bg-muted'
            )}>
              {trend === 'up' ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : trend === 'down' ? (
                <TrendingDown className="h-5 w-5 text-red-500" />
              ) : (
                <Minus className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <span className={cn(
              "text-sm font-bold",
              trend === 'up' ? 'text-emerald-500' :
              trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {formatPercent(change)}
            </span>
          </div>
          
          {/* Current Month */}
          <div className="text-center p-3 bg-primary/10 rounded-xl border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">{currentMonth}</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(stats.thisMonth)}
            </p>
          </div>
        </div>
        
        {/* Difference */}
        <div className="mt-3 p-3 bg-muted/30 rounded-lg text-center">
          <span className="text-sm text-muted-foreground">
            Diferença: 
            <span className={cn(
              "ml-1 font-semibold",
              trend === 'up' ? 'text-emerald-500' :
              trend === 'down' ? 'text-red-500' : 'text-foreground'
            )}>
              {trend === 'up' ? '+' : ''}{formatCurrency(stats.thisMonth - stats.lastMonth)}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

MonthlyComparison.displayName = 'MonthlyComparison';
