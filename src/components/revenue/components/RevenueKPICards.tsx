import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wallet, RefreshCw, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { ProfitStats } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { KPICardSkeleton } from '../skeletons/KPICardSkeleton';
import { cn } from '@/lib/utils';

interface RevenueKPICardsProps {
  stats: ProfitStats;
  isLoading: boolean;
  onRefresh: () => void;
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
        "text-center p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
        variantClasses[variant]
      )}
    >
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <div className={cn("text-lg sm:text-xl font-bold", valueClasses[variant])}>
          {formatCurrency(value)}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn(
            "flex items-center text-xs font-medium",
            trend > 0 ? "text-emerald-500" : "text-red-500"
          )}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="ml-0.5">{formatPercent(Math.abs(trend), false)}</span>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {sublabel && (
        <p className="text-xs text-muted-foreground/70 mt-0.5">{sublabel}</p>
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

export const RevenueKPICards = memo(({ stats, isLoading, onRefresh }: RevenueKPICardsProps) => {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          Receita da Plataforma
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh} 
          disabled={isLoading}
          className="h-9"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <KPICardSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPICard 
              value={stats.today} 
              label="Hoje" 
              variant="primary"
              tooltip="Lucro líquido gerado hoje (Taxas PIX + Taxa Saques - Custo PIX)"
            />
            <KPICard 
              value={stats.sevenDays} 
              label="7 Dias"
              tooltip="Lucro líquido dos últimos 7 dias"
            />
            <KPICard 
              value={stats.fifteenDays} 
              label="15 Dias"
              tooltip="Lucro líquido dos últimos 15 dias"
            />
            <KPICard 
              value={stats.thisMonth} 
              label="Este Mês"
              trend={stats.monthOverMonthChange}
              tooltip={`Lucro do mês atual. ${stats.monthOverMonthChange > 0 ? 'Alta' : stats.monthOverMonthChange < 0 ? 'Queda' : 'Estável'} comparado ao mês anterior.`}
            />
            <KPICard 
              value={stats.thisYear} 
              label="Este Ano"
              variant="highlight"
              tooltip="Lucro líquido acumulado do ano"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

RevenueKPICards.displayName = 'RevenueKPICards';
