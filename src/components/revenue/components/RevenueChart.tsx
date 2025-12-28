import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { TrendingUp } from "lucide-react";
import { ChartData, ChartFilter, CHART_FILTER_OPTIONS } from '../types';
import { formatCurrency } from '../utils';
import { ChartSkeleton } from '../skeletons/KPICardSkeleton';
import { cn } from '@/lib/utils';

interface RevenueChartProps {
  data: ChartData[];
  filter: ChartFilter;
  onFilterChange: (filter: ChartFilter) => void;
  isLoading: boolean;
}

export const RevenueChart = memo(({ data, filter, onFilterChange, isLoading }: RevenueChartProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          Evolução do Lucro
        </CardTitle>
        <div className="flex items-center bg-muted rounded-full p-1">
          {CHART_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                filter === option.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <>
            <div className="h-[280px] sm:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data} 
                  margin={{ top: 30, right: 10, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="barGradientProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    className="stroke-muted" 
                    opacity={0.3}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    tickLine={false}
                    axisLine={false}
                    interval={filter === 'today' ? 0 : 'preserveStartEnd'}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      fontSize: '12px'
                    }}
                    labelStyle={{ 
                      color: 'hsl(var(--foreground))', 
                      fontWeight: 600, 
                      marginBottom: '6px' 
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                  />
                  <Bar 
                    dataKey="lucro" 
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    fill="url(#barGradientProfit)"
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    <LabelList 
                      dataKey="lucro"
                      position="top"
                      fill="hsl(142, 76%, 36%)"
                      fontSize={10}
                      fontWeight={600}
                      offset={8}
                      formatter={(value: number) => value > 0 ? `R$${value.toFixed(0)}` : ''}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-xs text-muted-foreground font-medium">
                Lucro Líquido
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

RevenueChart.displayName = 'RevenueChart';
