import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, TrendingUp, TrendingDown, Minus, HelpCircle, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';
import { ACQUIRER_COLORS } from '../types';
import { ProfitStats } from '../types';
import { formatCurrency, getMarginPercentage } from '../utils';
import { BreakdownSkeleton } from '../skeletons/KPICardSkeleton';
import { cn } from '@/lib/utils';

interface RevenueBreakdownProps {
  stats: ProfitStats;
  isLoading: boolean;
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
        "text-center p-4 rounded-xl border transition-all duration-200 hover:shadow-md",
        config.bg,
        config.border
      )}
    >
      <div className={cn("text-lg font-bold", config.text)}>
        {config.prefix}{formatCurrency(value)}
      </div>
      <p className="text-sm font-medium text-muted-foreground mt-1">{label}</p>
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

BreakdownItem.displayName = 'BreakdownItem';

export const RevenueBreakdown = memo(({ stats, isLoading }: RevenueBreakdownProps) => {
  const margin = getMarginPercentage(stats.thisMonth, stats.gross.thisMonth);
  const marginTrend = margin >= 70 ? 'good' : margin >= 50 ? 'medium' : 'low';

  const acquirerCostData = useMemo(() => {
    const breakdown = stats.acquirerBreakdown || {};
    return [
      { name: 'Valorion', cost: breakdown.valorion?.thisMonth?.cost || 0, color: ACQUIRER_COLORS.valorion.color },
      { name: 'Ativus', cost: breakdown.ativus?.thisMonth?.cost || 0, color: ACQUIRER_COLORS.ativus.color },
      { name: 'Inter', cost: breakdown.inter?.thisMonth?.cost || 0, color: ACQUIRER_COLORS.inter.color },
    ].sort((a, b) => b.cost - a.cost);
  }, [stats.acquirerBreakdown]);

  const maxCost = Math.max(...acquirerCostData.map(d => d.cost), 1);

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <Calculator className="h-4 w-4 text-amber-500" />
          </div>
          Breakdown: Receita vs Custos
          <span className="text-xs font-normal text-muted-foreground ml-1">(Este Mês)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <BreakdownSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <BreakdownItem 
                value={stats.gross.thisMonth}
                label="Receita Bruta"
                sublabel="Taxas cobradas"
                type="revenue"
                tooltip="Total de taxas PIX cobradas dos usuários pelas transações aprovadas"
              />
              <BreakdownItem 
                value={stats.acquirerCosts.thisMonth}
                label="Custo PIX"
                sublabel="Pago aos adquirentes"
                type="cost"
                tooltip="Custo pago aos adquirentes (Valorion R$0.29/tx, Ativus R$0.05/tx, Inter R$0.00/tx)"
              />
              <BreakdownItem 
                value={stats.withdrawalFees.thisMonth}
                label="Receita Saques"
                sublabel="R$ 5,00/saque"
                type="neutral"
                tooltip="Taxa de R$ 5,00 cobrada por cada saque realizado pelos usuários"
              />
              <BreakdownItem 
                value={stats.thisMonth}
                label="Lucro Líquido"
                sublabel="Taxas + Saques - Custos"
                type="profit"
                tooltip="Lucro final = Taxas PIX + Taxa Saques - Custo PIX"
              />
            </div>
            
            {/* Margin indicator */}
            {stats.gross.thisMonth > 0 && (
              <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Margem de Lucro:</span>
                <div className={cn(
                  "flex items-center gap-1.5 font-semibold",
                  marginTrend === 'good' ? 'text-emerald-500' : 
                  marginTrend === 'medium' ? 'text-amber-500' : 'text-red-500'
                )}>
                  {marginTrend === 'good' ? <TrendingUp className="h-4 w-4" /> : 
                   marginTrend === 'low' ? <TrendingDown className="h-4 w-4" /> : 
                   <Minus className="h-4 w-4" />}
                  {margin.toFixed(1)}%
                </div>
              </div>
            )}

            {/* Acquirer Cost Chart */}
            {maxCost > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Custo por Adquirente</span>
                </div>
                <div className="h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={acquirerCostData}
                      layout="vertical"
                      margin={{ top: 0, right: 60, left: 60, bottom: 0 }}
                    >
                      <XAxis type="number" hide domain={[0, maxCost * 1.1]} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        width={55}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Custo']}
                      />
                      <Bar 
                        dataKey="cost" 
                        radius={[0, 4, 4, 0]}
                        maxBarSize={20}
                      >
                        {acquirerCostData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList 
                          dataKey="cost" 
                          position="right" 
                          formatter={(value: number) => formatCurrency(value)}
                          style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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

RevenueBreakdown.displayName = 'RevenueBreakdown';
