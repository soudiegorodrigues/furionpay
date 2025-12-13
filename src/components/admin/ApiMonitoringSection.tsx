import { useState, useEffect } from "react";
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
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

export function ApiMonitoringSection() {
  const [healthData, setHealthData] = useState<HealthSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [healthResult, eventsResult] = await Promise.all([
        supabase.rpc('get_api_health_summary'),
        supabase.rpc('get_recent_api_events', { p_limit: 20 })
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
    fetchData();
  };

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant={getEventBadgeVariant(event.event_type)} className="text-xs capitalize">
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm font-medium capitalize">{event.acquirer}</span>
                    {event.retry_attempt && (
                      <span className="text-xs text-muted-foreground">
                        (tentativa {event.retry_attempt})
                      </span>
                    )}
                    {event.error_message && (
                      <span className="text-xs text-destructive truncate max-w-xs">
                        {event.error_message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {event.response_time_ms && (
                      <span>{event.response_time_ms}ms</span>
                    )}
                    <span>{formatTime(event.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
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
