import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { DollarSign, TrendingUp, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TransacoesGlobaisSection } from "./TransacoesGlobaisSection";

interface GlobalStats {
  total_generated: number;
  total_paid: number;
  total_expired: number;
  total_amount_generated: number;
  total_amount_paid: number;
  total_fees: number;
  today_generated: number;
  today_paid: number;
  today_amount_paid: number;
  today_fees: number;
  month_paid: number;
  month_amount_paid: number;
  month_fees: number;
}

interface ChartData {
  date: string;
  vendas: number;
  faturamento: number;
}

type ChartFilter = '7days' | '15days' | '30days' | '90days';

const chartFilterOptions: { value: ChartFilter; label: string }[] = [
  { value: '7days', label: '7 dias' },
  { value: '15days', label: '15 dias' },
  { value: '30days', label: '30 dias' },
  { value: '90days', label: '90 dias' },
];

// Memoized StatCard component
interface StatCardProps {
  value: string | number;
  label: string;
  subLabel?: string;
  colorClass?: string;
  size?: 'normal' | 'small';
}

const StatCard = memo(({ value, label, subLabel, colorClass = "text-foreground", size = 'normal' }: StatCardProps) => (
  <div className={cn(
    "text-center rounded-lg transition-all duration-200 hover:bg-muted/50 hover:scale-[1.02]",
    size === 'small' ? "p-2 sm:p-4 bg-primary/10" : "p-3 sm:p-4 bg-muted/30"
  )}>
    <div className={cn(
      "font-bold",
      size === 'small' ? "text-base sm:text-xl" : "text-lg sm:text-2xl",
      colorClass
    )}>
      {value}
    </div>
    <p className={cn(
      "text-muted-foreground",
      size === 'small' ? "text-[10px] sm:text-sm" : "text-xs sm:text-sm"
    )}>
      {label}
    </p>
    {subLabel && (
      <p className="text-[10px] sm:text-xs text-muted-foreground">{subLabel}</p>
    )}
  </div>
));

StatCard.displayName = 'StatCard';

// Stats skeleton component
const StatsSkeleton = memo(() => (
  <div className="grid grid-cols-3 gap-2 sm:gap-4">
    {[1, 2, 3].map(i => (
      <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />
    ))}
    <div className="col-span-3 mt-3 sm:mt-4">
      <Skeleton className="h-5 w-16 mb-2 sm:mb-3" />
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 sm:h-20 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
));

StatsSkeleton.displayName = 'StatsSkeleton';

// Chart skeleton component
const ChartSkeleton = memo(() => (
  <div className="h-[280px] sm:h-[320px] w-full flex flex-col gap-4">
    <div className="flex-1 flex items-end gap-1 px-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="flex-1 rounded-t-sm" 
          style={{ height: `${30 + Math.random() * 60}%` }} 
        />
      ))}
    </div>
    <Skeleton className="h-4 w-full" />
  </div>
));

ChartSkeleton.displayName = 'ChartSkeleton';

export const FaturamentoSection = () => {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);
  const [chartFilter, setChartFilter] = useState<ChartFilter>('7days');

  // Memoized currency formatter
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  // Memoized conversion rate calculation
  const conversionRate = useMemo(() => {
    if (!globalStats || globalStats.total_generated === 0) return '0';
    return ((globalStats.total_paid / globalStats.total_generated) * 100).toFixed(1);
  }, [globalStats]);

  const loadGlobalStats = useCallback(async () => {
    try {
      // Usar RPC otimizada V2 com tabela agregada
      const { data, error } = await supabase.rpc('get_global_dashboard_v2');
      if (error) throw error;
      setGlobalStats(data as unknown as GlobalStats);
    } catch (error) {
      console.error('Error loading global stats:', error);
    }
  }, []);

  const loadChartData = useCallback(async (filter: ChartFilter = chartFilter) => {
    setIsChartLoading(true);
    try {
      const days = filter === '7days' ? 7 : filter === '15days' ? 15 : filter === '30days' ? 30 : 90;
      const { data, error } = await supabase.rpc('get_chart_data_by_day', { p_days: days });
      if (error) throw error;
      
      const formattedData = (data || []).map((row: { date_brazil: string; gerados: number; pagos: number; valor_pago: number }) => ({
        date: new Date(row.date_brazil).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        vendas: Number(row.pagos),
        faturamento: Number(row.valor_pago)
      }));
      setChartData(formattedData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsChartLoading(false);
    }
  }, [chartFilter]);

  // Initial parallel load
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([loadGlobalStats(), loadChartData('7days')]);
      setIsLoading(false);
    };
    loadAll();
  }, []);

  // Load chart data when filter changes (after initial load)
  useEffect(() => {
    if (!isLoading) {
      loadChartData(chartFilter);
    }
  }, [chartFilter]);

  const handleBatchCheck = useCallback(async () => {
    setIsCheckingBatch(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-check-pix-status');
      if (error) throw error;
      toast({
        title: "Verificação concluída",
        description: `${data?.checked || 0} verificadas, ${data?.updated || 0} atualizadas`
      });
      // Refresh both in parallel
      await Promise.all([loadGlobalStats(), loadChartData()]);
    } catch (error) {
      console.error('Batch check error:', error);
      toast({
        title: "Erro",
        description: "Falha ao verificar transações",
        variant: "destructive"
      });
    } finally {
      setIsCheckingBatch(false);
    }
  }, [loadGlobalStats, loadChartData]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadGlobalStats(), loadChartData()]);
    setIsLoading(false);
  }, [loadGlobalStats, loadChartData]);

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Faturamento Global
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBatchCheck}
              disabled={isCheckingBatch}
              className="flex-1 sm:flex-none"
            >
              {isCheckingBatch ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Verificar</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading} 
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="ml-2 hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <StatsSkeleton />
          ) : globalStats ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <StatCard 
                value={globalStats.total_generated} 
                label="PIX Gerados" 
                subLabel={formatCurrency(globalStats.total_amount_generated)}
                colorClass="text-foreground"
              />
              <StatCard 
                value={globalStats.total_paid} 
                label="PIX Pagos" 
                subLabel={formatCurrency(globalStats.total_amount_paid)}
                colorClass="text-foreground"
              />
              <StatCard 
                value={`${conversionRate}%`} 
                label="Conversão" 
                colorClass="text-foreground"
              />

              {/* Today Stats */}
              <div className="col-span-3 mt-3 sm:mt-4">
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Hoje</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <StatCard 
                    value={globalStats.today_generated} 
                    label="Gerados" 
                    colorClass="text-foreground"
                    size="small"
                  />
                  <StatCard 
                    value={globalStats.today_paid} 
                    label="Pagos" 
                    colorClass="text-foreground"
                    size="small"
                  />
                  <StatCard 
                    value={formatCurrency(globalStats.today_amount_paid)} 
                    label="Recebido" 
                    colorClass="text-foreground truncate"
                    size="small"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chart - Visão Geral */}
      <Card className="bg-slate-900 border-slate-800 rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-white text-lg">Visão Geral</CardTitle>
            
            {/* Filter buttons */}
            <div className="flex items-center gap-1">
              {chartFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setChartFilter(option.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                    chartFilter === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <>
              <div className={cn(
                "h-[250px] w-full transition-opacity duration-300",
                isChartLoading && "opacity-50"
              )}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={chartData} 
                    margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="hsl(var(--border))" 
                      opacity={0.2} 
                    />
                    <XAxis
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={40}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        fontSize: '12px'
                      }}
                      labelStyle={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '6px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'vendas') return [value, 'Vendas'];
                        if (name === 'faturamento') return [
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                          'Faturamento'
                        ];
                        return [value, name];
                      }}
                    />
                    <Line 
                      type="monotone"
                      dataKey="vendas" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                    <Line 
                      type="monotone"
                      dataKey="faturamento" 
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legenda centralizada */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-xs text-slate-400">Vendas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-xs text-slate-400">Faturamento</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transações Globais */}
      <TransacoesGlobaisSection />
    </div>
  );
};
