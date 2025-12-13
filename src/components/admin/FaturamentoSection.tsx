import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Loader2, RefreshCw, Calendar, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface GlobalStats {
  total_generated: number;
  total_paid: number;
  total_expired: number;
  total_amount_generated: number;
  total_amount_paid: number;
  today_generated: number;
  today_paid: number;
  today_amount_paid: number;
}

interface Transaction {
  id: string;
  amount: number;
  status: 'generated' | 'paid' | 'expired';
  txid: string;
  donor_name: string;
  product_name: string | null;
  created_at: string;
  paid_at: string | null;
  user_email: string | null;
}

interface ChartData {
  date: string;
  gerados: number;
  pagos: number;
  valorPago: number;
}

type ChartFilter = 'today' | '7days' | '15days' | '30days' | 'month' | 'year';

export const FaturamentoSection = () => {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);
  const [chartFilter, setChartFilter] = useState<ChartFilter>('today');

  useEffect(() => {
    loadGlobalStats();
    loadTransactions();
  }, []);

  const loadGlobalStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pix_dashboard_auth');
      if (error) throw error;
      setGlobalStats(data as unknown as GlobalStats);
    } catch (error) {
      console.error('Error loading global stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pix_transactions_auth', { p_limit: 500 });
      if (error) throw error;
      setTransactions(data as unknown as Transaction[] || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleBatchCheck = async () => {
    setIsCheckingBatch(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-check-pix-status');
      if (error) throw error;
      toast({
        title: "Verificação concluída",
        description: `${data?.checked || 0} verificadas, ${data?.updated || 0} atualizadas`
      });
      loadGlobalStats();
      loadTransactions();
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
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const conversionRate = globalStats && globalStats.total_generated > 0 
    ? ((globalStats.total_paid / globalStats.total_generated) * 100).toFixed(1) 
    : '0';

  const getChartDays = (filter: ChartFilter): number => {
    switch (filter) {
      case 'today': return 1;
      case '7days': return 7;
      case '15days': return 15;
      case '30days': return 30;
      case 'month': return 30;
      case 'year': return 365;
      default: return 30;
    }
  };

  // Helper para obter data/hora no timezone de São Paulo
  const getBrazilDateStr = (date: Date): string => {
    return date.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  };

  const getBrazilHour = (date: Date): number => {
    return parseInt(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  };

  const globalChartData = useMemo((): ChartData[] => {
    const data: ChartData[] = [];
    const now = new Date();
    
    // If "today" is selected, show hourly data (00:00 to 23:00)
    if (chartFilter === 'today') {
      const todayStr = getBrazilDateStr(now);
      
      for (let hour = 0; hour < 24; hour++) {
        const displayHour = `${hour.toString().padStart(2, '0')}:00`;
        
        const hourTransactions = transactions.filter(tx => {
          const txDate = new Date(tx.created_at);
          const txDateStr = getBrazilDateStr(txDate);
          const txHour = getBrazilHour(txDate);
          return txDateStr === todayStr && txHour === hour;
        });
        
        const gerados = hourTransactions.length;
        const pagos = hourTransactions.filter(tx => tx.status === 'paid').length;
        const valorPago = hourTransactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
        
        data.push({ date: displayHour, gerados, pagos, valorPago });
      }
      
      return data;
    }
    
    // For other filters, show daily data
    const days = getChartDays(chartFilter);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        return txDate === dateStr;
      });
      
      const gerados = dayTransactions.length;
      const pagos = dayTransactions.filter(tx => tx.status === 'paid').length;
      const valorPago = dayTransactions.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
      
      data.push({ date: displayDate, gerados, pagos, valorPago });
    }
    
    return data;
  }, [transactions, chartFilter]);

  return (
    <>
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
            <Button variant="outline" size="sm" onClick={() => { loadGlobalStats(); loadTransactions(); }} disabled={isLoading} className="flex-1 sm:flex-none">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : globalStats ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-blue-500">
                  {globalStats.total_generated}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">PIX Gerados</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {formatCurrency(globalStats.total_amount_generated)}
                </p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-green-500">
                  {globalStats.total_paid}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">PIX Pagos</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {formatCurrency(globalStats.total_amount_paid)}
                </p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-yellow-500">
                  {conversionRate}%
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">Conversão</p>
              </div>

              {/* Today Stats */}
              <div className="col-span-3 mt-3 sm:mt-4">
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Hoje</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center p-2 sm:p-4 bg-primary/10 rounded-lg">
                    <div className="text-lg sm:text-2xl font-bold text-blue-500">
                      {globalStats.today_generated}
                    </div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Gerados</p>
                  </div>
                  <div className="text-center p-2 sm:p-4 bg-primary/10 rounded-lg">
                    <div className="text-lg sm:text-2xl font-bold text-green-500">
                      {globalStats.today_paid}
                    </div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Pagos</p>
                  </div>
                  <div className="text-center p-2 sm:p-4 bg-primary/10 rounded-lg">
                    <div className="text-sm sm:text-2xl font-bold text-primary truncate">
                      {formatCurrency(globalStats.today_amount_paid)}
                    </div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Recebido</p>
                  </div>
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

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-sm sm:text-lg">Evolução de Transações</CardTitle>
            </div>
            <Select value={chartFilter} onValueChange={(v) => setChartFilter(v as ChartFilter)}>
              <SelectTrigger className="w-[120px] h-8 text-xs sm:text-sm">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">7 dias</SelectItem>
                <SelectItem value="15days">15 dias</SelectItem>
                <SelectItem value="30days">30 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={globalChartData} margin={{ top: 30, right: 5, left: 5, bottom: 30 }} barCategoryGap="50%" barSize={20}>
                <defs>
                  <linearGradient id="barGradientPaidGlobal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="barGradientGeneratedGlobal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
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
                  tick={{ fontSize: 8 }} 
                  angle={-45}
                  textAnchor="end"
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  interval={chartFilter === 'today' ? 0 : chartFilter === 'year' ? 29 : 'preserveStartEnd'}
                  height={50}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
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
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '6px' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'pagos') return [value, '🔴 Pagos'];
                    if (name === 'gerados') return [value, '⚫ Gerados'];
                    return [value, name];
                  }}
                />
                <Bar 
                  dataKey="gerados" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  fill="url(#barGradientGeneratedGlobal)"
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar 
                  dataKey="pagos" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  fill="url(#barGradientPaidGlobal)"
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-muted-foreground/50"></span>
              <span className="text-xs text-muted-foreground font-medium">Gerados</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-xs text-muted-foreground font-medium">Pagos</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
