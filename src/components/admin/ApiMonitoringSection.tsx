import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Server,
  Zap,
  XCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface AcquirerHealth {
  total_calls_24h: number;
  success_count: number;
  failure_count: number;
  retry_count: number;
  circuit_opens: number;
  avg_response_time: number | null;
  success_rate: number | null;
  last_failure: string | null;
  is_circuit_open: boolean;
}

interface HealthSummary {
  spedpay: AcquirerHealth | null;
  inter: AcquirerHealth | null;
  ativus: AcquirerHealth | null;
}

interface ApiEvent {
  id: string;
  acquirer: string;
  event_type: string;
  response_time_ms: number | null;
  error_message: string | null;
  retry_attempt: number | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

export function ApiMonitoringSection() {
  const [healthData, setHealthData] = useState<HealthSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    try {
      const [healthResult, eventsResult] = await Promise.all([
        supabase.rpc('get_api_health_summary'),
        supabase.rpc('get_recent_api_events', { p_limit: 100 })
      ]);

      if (healthResult.error) throw healthResult.error;
      if (eventsResult.error) throw eventsResult.error;

      setHealthData(healthResult.data as unknown as HealthSummary);
      setRecentEvents(eventsResult.data as unknown as ApiEvent[]);
    } catch (error) {
      console.error('Error fetching API monitoring data:', error);
      toast.error('Erro ao carregar dados de monitoramento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchData();
  };

  // Pagination logic
  const totalPages = Math.ceil(recentEvents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = useMemo(() => 
    recentEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE),
    [recentEvents, startIndex]
  );

  // Timeline data processing - group events by hour for last 24h
  const timelineData = useMemo(() => {
    const now = new Date();
    const hours: { [key: string]: { time: string; spedpay: number; inter: number; ativus: number } } = {};
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
      hours[key] = { time: key, spedpay: 0, inter: 0, ativus: 0 };
    }
    
    // Count events per hour per acquirer
    recentEvents.forEach(event => {
      const eventDate = new Date(event.created_at);
      const key = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
      if (hours[key]) {
        if (event.acquirer === 'spedpay') hours[key].spedpay++;
        else if (event.acquirer === 'inter') hours[key].inter++;
        else if (event.acquirer === 'ativus') hours[key].ativus++;
      }
    });
    
    return Object.values(hours);
  }, [recentEvents]);

  const getStatusColor = (health: AcquirerHealth | null) => {
    if (!health || health.total_calls_24h === 0) return "bg-muted text-muted-foreground";
    if (health.is_circuit_open) return "bg-destructive text-destructive-foreground";
    if ((health.success_rate ?? 0) >= 95) return "bg-green-500 text-white";
    if ((health.success_rate ?? 0) >= 80) return "bg-yellow-500 text-white";
    return "bg-destructive text-destructive-foreground";
  };

  const getStatusIcon = (health: AcquirerHealth | null) => {
    if (!health || health.total_calls_24h === 0) return <Server className="h-4 w-4" />;
    if (health.is_circuit_open) return <AlertTriangle className="h-4 w-4" />;
    if ((health.success_rate ?? 0) >= 95) return <CheckCircle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const getEventBadgeVariant = (eventType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (eventType) {
      case 'success': return 'default';
      case 'failure': return 'destructive';
      case 'retry': return 'secondary';
      case 'circuit_open': return 'destructive';
      case 'circuit_close': return 'outline';
      default: return 'secondary';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const AcquirerCard = ({ name, health }: { name: string; health: AcquirerHealth | null }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium capitalize">{name}</CardTitle>
          <Badge className={getStatusColor(health)}>
            {getStatusIcon(health)}
            <span className="ml-1">
              {health?.is_circuit_open ? 'Circuit Open' : 
               !health || health.total_calls_24h === 0 ? 'Sem dados' : 
               `${health.success_rate ?? 0}%`}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {health && health.total_calls_24h > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Chamadas 24h:</span>
                <span className="font-medium">{health.total_calls_24h}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="text-muted-foreground">Sucesso:</span>
                <span className="font-medium text-green-600">{health.success_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-muted-foreground">Falhas:</span>
                <span className="font-medium text-destructive">{health.failure_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-muted-foreground">Retries:</span>
                <span className="font-medium text-yellow-600">{health.retry_count}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Tempo médio:</span>
                <span className="font-medium">{health.avg_response_time ?? '-'}ms</span>
              </div>
              {health.circuit_opens > 0 && (
                <Badge variant="outline" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {health.circuit_opens} circuit opens
                </Badge>
              )}
            </div>

            {health.last_failure && (
              <div className="text-xs text-muted-foreground pt-1">
                Última falha: {new Date(health.last_failure).toLocaleString('pt-BR')}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma atividade nas últimas 24h</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Monitoramento de APIs</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Monitoramento de APIs</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AcquirerCard name="SpedPay" health={healthData?.spedpay ?? null} />
        <AcquirerCard name="Banco Inter" health={healthData?.inter ?? null} />
        <AcquirerCard name="Ativus Hub" health={healthData?.ativus ?? null} />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Timeline de Eventos (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }} 
                  interval="preserveStartEnd"
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
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconSize={10}
                />
                <Line 
                  type="monotone" 
                  dataKey="spedpay" 
                  name="SpedPay"
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="inter" 
                  name="Banco Inter"
                  stroke="#F97316" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ativus" 
                  name="Ativus Hub"
                  stroke="#22C55E" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length > 0 ? (
            <>
              <div className="space-y-2">
                {paginatedEvents.map(event => (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b last:border-0 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getEventBadgeVariant(event.event_type)} className="text-xs capitalize">
                        {event.event_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm font-medium capitalize">{event.acquirer}</span>
                      {event.retry_attempt && (
                        <span className="text-xs text-muted-foreground">
                          (tentativa {event.retry_attempt})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {event.response_time_ms && (
                        <span>{event.response_time_ms}ms</span>
                      )}
                      <span>{formatTime(event.created_at)}</span>
                    </div>
                    {event.error_message && (
                      <span className="text-xs text-destructive truncate w-full sm:hidden">
                        {event.error_message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, recentEvents.length)} de {recentEvents.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum evento registrado ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
