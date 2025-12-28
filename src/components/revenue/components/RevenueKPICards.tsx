import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wallet, RefreshCw, TrendingUp, TrendingDown, HelpCircle, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';
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

export const RevenueKPICards = memo(({ stats, isLoading, onRefresh }: RevenueKPICardsProps) => {
  const revenueBreakdownData = useMemo(() => {
    return [
      { 
        name: 'Taxa Percentual', 
        value: stats.percentageRevenue?.thisMonth || 0, 
        color: REVENUE_COLORS.taxaPercentual,
        description: 'Receita de taxas percentuais (ex: 4.99%)'
      },
      { 
        name: 'Valor Fixo', 
        value: stats.fixedRevenue?.thisMonth || 0, 
        color: REVENUE_COLORS.valorFixo,
        description: 'Receita de valores fixos por transação'
      },
      { 
        name: 'Taxa Saque', 
        value: stats.withdrawalFees?.thisMonth || 0, 
        color: REVENUE_COLORS.taxaSaque,
        description: 'Taxas cobradas sobre saques'
      },
      { 
        name: 'Custo PIX', 
        value: stats.pixCosts?.thisMonth || 0, 
        color: REVENUE_COLORS.custoPix,
        description: 'Custo pago aos adquirentes'
      },
    ].filter(item => item.value !== 0);
  }, [stats]);

  const maxValue = useMemo(() => {
    return Math.max(...revenueBreakdownData.map(d => d.value), 1);
  }, [revenueBreakdownData]);

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
      <CardContent className="space-y-6">
        {isLoading ? (
          <KPICardSkeleton count={5} />
        ) : (
          <>
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

            {/* Revenue Composition Chart */}
            {revenueBreakdownData.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Composição da Receita (Este Mês)
                  </h4>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueBreakdownData}
                      layout="vertical"
                      margin={{ top: 0, right: 80, left: 70, bottom: 0 }}
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
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        width={65}
                      />
                      <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        background={false}
                      >
                        {revenueBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(value: number) => formatCurrency(value)}
                          style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
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
