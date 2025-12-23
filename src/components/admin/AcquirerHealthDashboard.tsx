import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Loader2,
  Activity,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AcquirerHealth {
  id: string;
  acquirer: string;
  is_healthy: boolean;
  last_check_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  consecutive_successes: number;
  avg_response_time_ms: number;
  last_error_message: string | null;
}

const ACQUIRER_LABELS: Record<string, string> = {
  ativus: 'Ativus Hub',
  inter: 'Banco Inter',
  valorion: 'Valorion',
  efi: 'EFI Pay',
};

const ACQUIRER_COLORS: Record<string, string> = {
  ativus: 'bg-purple-500',
  inter: 'bg-orange-500',
  valorion: 'bg-green-500',
  efi: 'bg-blue-500',
};

export const AcquirerHealthDashboard = () => {
  const [healthData, setHealthData] = useState<AcquirerHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHealthData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('acquirer-health-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'acquirer_health_status'
        },
        (payload) => {
          console.log('Health status changed:', payload);
          loadHealthData();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealthData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadHealthData = async () => {
    try {
      const { data, error } = await supabase
        .from('acquirer_health_status')
        .select('*')
        .order('avg_response_time_ms', { ascending: true });

      if (error) throw error;
      setHealthData((data as AcquirerHealth[]) || []);
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerHealthCheck = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('health-check-acquirers');
      
      if (error) throw error;
      
      toast.success('Health check executado com sucesso');
      await loadHealthData();
    } catch (error) {
      console.error('Error triggering health check:', error);
      toast.error('Erro ao executar health check');
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Nunca';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return 'Nunca';
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 60) return `${diffSecs}s atrás`;
    if (diffMins < 60) return `${diffMins}min atrás`;
    return formatTime(timestamp);
  };

  const healthyCount = healthData.filter(h => h.is_healthy).length;
  const unhealthyCount = healthData.filter(h => !h.is_healthy).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Monitoramento de Saúde</CardTitle>
              <CardDescription className="text-xs">
                Status em tempo real dos adquirentes • Atualiza a cada 30s
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={healthyCount === healthData.length ? 'default' : 'destructive'} className="gap-1">
              {healthyCount === healthData.length ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {healthyCount}/{healthData.length} Online
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={triggerHealthCheck}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {healthData.map((health) => (
            <Card 
              key={health.id} 
              className={`border-2 transition-all ${
                health.is_healthy 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${ACQUIRER_COLORS[health.acquirer]}`} />
                    <span className="font-semibold text-sm">
                      {ACQUIRER_LABELS[health.acquirer] || health.acquirer}
                    </span>
                  </div>
                  {health.is_healthy ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={health.is_healthy ? 'default' : 'destructive'} className="text-xs">
                      {health.is_healthy ? 'Saudável' : 'Com Problema'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Resposta:
                    </span>
                    <span className={`font-mono ${
                      health.avg_response_time_ms < 1000 ? 'text-green-600' :
                      health.avg_response_time_ms < 2000 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {health.avg_response_time_ms}ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Último check:</span>
                    <span className="text-muted-foreground">
                      {formatRelativeTime(health.last_check_at)}
                    </span>
                  </div>

                  {health.is_healthy ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Sucessos:</span>
                      <span className="text-green-600 font-medium">
                        {health.consecutive_successes} consecutivos
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Falhas:</span>
                        <span className="text-red-600 font-medium">
                          {health.consecutive_failures} consecutivas
                        </span>
                      </div>
                      {health.last_error_message && (
                        <div className="text-xs text-red-500 mt-2 p-2 bg-red-500/10 rounded truncate">
                          {health.last_error_message}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary stats */}
        {unhealthyCount > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>
                <strong>{unhealthyCount}</strong> adquirente(s) com problema. 
                O sistema está usando automaticamente os adquirentes saudáveis.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
