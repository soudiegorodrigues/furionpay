import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Zap,
  Target,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

interface RetryStats {
  acquirer: string;
  total: number;
  success: number;
  failure: number;
  retry: number;
  successRate: number;
}

interface TimelinePoint {
  time: string;
  success: number;
  failure: number;
  retry: number;
}

const COLORS = {
  inter: '#F97316', 
  ativus: '#22C55E',
  valorion: '#10B981'
};

const ACQUIRER_NAMES: Record<string, string> = {
  inter: 'Banco Inter',
  ativus: 'Ativus Hub',
  valorion: 'Valorion'
};

export function RetryDashboardSection() {
  const [stats, setStats] = useState<RetryStats[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const { data: events, error } = await supabase
        .rpc('get_recent_api_events', { p_limit: 500 });

      if (error) throw error;

      setRecentEvents(events || []);
      
      // Process stats per acquirer
      const acquirers = ['inter', 'ativus', 'valorion'];
      const processedStats: RetryStats[] = acquirers.map(acquirer => {
        const acquirerEvents = (events || []).filter((e: any) => e.acquirer === acquirer);
        const success = acquirerEvents.filter((e: any) => e.event_type === 'success').length;
        const failure = acquirerEvents.filter((e: any) => e.event_type === 'failure').length;
        const retry = acquirerEvents.filter((e: any) => e.event_type === 'retry').length;
        const total = success + failure;
        
        return {
          acquirer,
          total: acquirerEvents.length,
          success,
          failure,
          retry,
          successRate: total > 0 ? Math.round((success / total) * 100) : 0
        };
      });

      setStats(processedStats);
    } catch (error) {
      console.error('Error fetching retry stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Real-time subscription
    const channel = supabase
      .channel('retry-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'api_monitoring_events'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Timeline data - last 12 hours
  const timelineData = useMemo((): TimelinePoint[] => {
    const now = new Date();
    const hours: Record<string, TimelinePoint> = {};
    
    const getBrazilHour = (date: Date): number => {
      const brazilTime = date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false });
      return parseInt(brazilTime, 10);
    };
    
    // Initialize last 12 hours
    for (let i = 11; i >= 0; i--) {
      const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
      const brazilHour = getBrazilHour(hourDate);
      const key = `${brazilHour.toString().padStart(2, '0')}h`;
      hours[key] = { time: key, success: 0, failure: 0, retry: 0 };
    }
    
    // Count events
    recentEvents.forEach((event: any) => {
      const eventDate = new Date(event.created_at);
      const eventHour = getBrazilHour(eventDate);
      const key = `${eventHour.toString().padStart(2, '0')}h`;
      
      if (hours[key]) {
        if (event.event_type === 'success') hours[key].success++;
        else if (event.event_type === 'failure') hours[key].failure++;
        else if (event.event_type === 'retry') hours[key].retry++;
      }
    });
    
    return Object.values(hours);
  }, [recentEvents]);

  // Pie chart data for success/failure distribution
  const pieData = useMemo(() => {
    const totalSuccess = stats.reduce((acc, s) => acc + s.success, 0);
    const totalFailure = stats.reduce((acc, s) => acc + s.failure, 0);
    const totalRetry = stats.reduce((acc, s) => acc + s.retry, 0);
    
    return [
      { name: 'Sucesso', value: totalSuccess, color: '#22C55E' },
      { name: 'Falha', value: totalFailure, color: '#EF4444' },
      { name: 'Retry', value: totalRetry, color: '#F59E0B' }
    ].filter(d => d.value > 0);
  }, [stats]);


  // Overall stats
  const overallStats = useMemo(() => {
    const totalSuccess = stats.reduce((acc, s) => acc + s.success, 0);
    const totalFailure = stats.reduce((acc, s) => acc + s.failure, 0);
    const totalRetry = stats.reduce((acc, s) => acc + s.retry, 0);
    const total = totalSuccess + totalFailure;
    const overallRate = total > 0 ? Math.round((totalSuccess / total) * 100) : 0;
    
    return { totalSuccess, totalFailure, totalRetry, total, overallRate };
  }, [stats]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Dashboard de Retentativas
              <Badge variant="outline" className="text-xs">Tempo Real</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Monitore em tempo real as tentativas de pagamento, retentativas e taxas de sucesso.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sucesso</p>
                <p className="text-2xl font-bold text-green-600">{overallStats.totalSuccess}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Falhas</p>
                <p className="text-2xl font-bold text-destructive">{overallStats.totalFailure}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <RefreshCw className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retentativas</p>
                <p className="text-2xl font-bold text-yellow-600">{overallStats.totalRetry}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-primary">{overallStats.overallRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Timeline Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Timeline de Tentativas (12h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    allowDecimals={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="success" 
                    name="Sucesso"
                    stroke="#22C55E" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failure" 
                    name="Falha"
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="retry" 
                    name="Retry"
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Distribuição de Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </CardContent>
    </Card>
  );
}
