import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { TrendingUp } from "lucide-react";
import { ChartData } from '../types';
import { formatCurrency } from '../utils';
import { ChartSkeleton } from '../skeletons/KPICardSkeleton';

interface RevenueChartProps {
  data: ChartData[];
  isLoading: boolean;
}

export const RevenueChart = memo(({ data, isLoading }: RevenueChartProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
          <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
          </div>
          <span className="hidden sm:inline">Evolução Mensal do Lucro</span>
          <span className="sm:hidden">Evolução Mensal</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <>
            <div className="h-[220px] sm:h-[280px] md:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data} 
                  margin={{ top: 25, right: 5, left: -15, bottom: 10 }}
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
                    tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} 
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} 
                    tickLine={false}
                    axisLine={false}
                    width={45}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      fontSize: '11px'
                    }}
                    labelStyle={{ 
                      color: 'hsl(var(--foreground))', 
                      fontWeight: 600, 
                      marginBottom: '4px' 
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                  />
                  <Bar 
                    dataKey="lucro" 
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                    fill="url(#barGradientProfit)"
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    <LabelList 
                      dataKey="lucro"
                      position="top"
                      fill="hsl(142, 76%, 36%)"
                      fontSize={8}
                      fontWeight={600}
                      offset={4}
                      formatter={(value: number) => value > 0 ? `R$${value.toFixed(0)}` : ''}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2 sm:mt-4">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
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
