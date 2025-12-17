import { useState, useEffect, useMemo, useCallback } from "react";
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
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const acquirerOptions = [
  { value: 'all', label: 'Todos', short: 'All' },
  { value: 'spedpay', label: 'SpedPay', short: 'SP' },
  { value: 'inter', label: 'Banco Inter', short: 'BI' },
  { value: 'ativus', label: 'Ativus Hub', short: 'AH' }
];

export function ApiMonitoringSection() {
  const [healthData, setHealthData] = useState<HealthSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [acquirerFilter, setAcquirerFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchData();
  }, [fetchData]);

  const filteredEvents = useMemo(() => 
    acquirerFilter === 'all' 
      ? recentEvents 
      : recentEvents.filter(e => e.acquirer === acquirerFilter),
    [recentEvents, acquirerFilter]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [acquirerFilter]);

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = useMemo(() => 
    filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE),
    [filteredEvents, startIndex]
  );

  const timelineData = useMemo(() => {
    const now = new Date();
    const hours: { [key: string]: { time: string; hour: number; spedpay: number; inter: number; ativus: number } } = {};
    
    const getBrazilHour = (date: Date): number => {
      const brazilTime = date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false });
      return parseInt(brazilTime, 10);
    };
    
    for (let i = 23; i >= 0; i--) {
      const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
      const brazilHour = getBrazilHour(hourDate);
      const key = `${brazilHour.toString().padStart(2, '0')}h`;
      if (!hours[key]) {
        hours[key] = { time: key, hour: brazilHour, spedpay: 0, inter: 0, ativus: 0 };
      }
    }
    
    recentEvents.forEach(event => {
      const eventDate = new Date(event.created_at);
      const eventHour = getBrazilHour(eventDate);
      const key = `${eventHour.toString().padStart(2, '0')}h`;
      
      if (hours[key]) {
        if (event.acquirer === 'spedpay') hours[key].spedpay++;
        else if (event.acquirer === 'inter') hours[key].inter++;
        else if (event.acquirer === 'ativus') hours[key].ativus++;
      }
    });
    
    const nowHour = getBrazilHour(now);
    return Object.values(hours).sort((a, b) => {
      const aOffset = (a.hour - nowHour + 48) % 24;
      const bOffset = (b.hour - nowHour + 48) % 24;
      return aOffset - bOffset;
    });
  }, [recentEvents]);

  const getStatusColor = useCallback((health: AcquirerHealth | null) => {
    if (!health || health.total_calls_24h === 0) return "bg-muted text-muted-foreground";
    if (health.is_circuit_open) return "bg-destructive text-destructive-foreground";
    if ((health.success_rate ?? 0) >= 95) return "bg-green-500 text-white";
    if ((health.success_rate ?? 0) >= 80) return "bg-yellow-500 text-white";
    return "bg-destructive text-destructive-foreground";
  }, []);

  const getStatusIcon = useCallback((health: AcquirerHealth | null) => {
    if (!health || health.total_calls_24h === 0) return <Server className="h-3 w-3 sm:h-4 sm:w-4" />;
    if (health.is_circuit_open) return <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />;
    if ((health.success_rate ?? 0) >= 95) return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
    return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
  }, []);

  const getEventBadgeVariant = useCallback((eventType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (eventType) {
      case 'success': return 'default';
      case 'failure': return 'destructive';
      case 'retry': return 'secondary';
      case 'circuit_open': return 'destructive';
      case 'circuit_close': return 'outline';
      default: return 'secondary';
    }
  }, []);

  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);

  const AcquirerCard = ({ name, health }: { name: string; health: AcquirerHealth | null }) => (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs sm:text-sm font-medium truncate">{name}</CardTitle>
          <Badge className={`${getStatusColor(health)} text-[10px] sm:text-xs shrink-0`}>
            {getStatusIcon(health)}
            <span className="ml-1">
              {health?.is_circuit_open ? 'Open' : 
               !health || health.total_calls_24h === 0 ? 'N/A' : 
               `${health.success_rate ?? 0}%`}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3">
        {health && health.total_calls_24h > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">24h:</span>
                <span className="font-medium">{health.total_calls_24h}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 shrink-0" />
                <span className="text-muted-foreground truncate">OK:</span>
                <span className="font-medium text-green-600">{health.success_count}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive shrink-0" />
                <span className="text-muted-foreground truncate">Falhas:</span>
                <span className="font-medium text-destructive">{health.failure_count}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-500 shrink-0" />
                <span className="text-muted-foreground truncate">Retry:</span>
                <span className="font-medium text-yellow-600">{health.retry_count}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm min-w-0">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">Média:</span>
                <span className="font-medium">{health.avg_response_time ?? '-'}ms</span>
              </div>
              {health.circuit_opens > 0 && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  {health.circuit_opens}
                </Badge>
              )}
            </div>

            {health.last_failure && (
              <div className="text-[10px] sm:text-xs text-muted-foreground pt-1 truncate">
                Última falha: {new Date(health.last_failure).toLocaleString('pt-BR')}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground">Sem atividade (24h)</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold">API Status</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold truncate">API Status</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="h-8 px-2 sm:px-3 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline ml-2">Atualizar</span>
        </Button>
      </div>

      {/* Acquirer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <AcquirerCard name="SpedPay" health={healthData?.spedpay ?? null} />
        <AcquirerCard name="Banco Inter" health={healthData?.inter ?? null} />
        <AcquirerCard name="Ativus Hub" health={healthData?.ativus ?? null} />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Timeline (24h)</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0">
          <div className="h-[180px] sm:h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 9 }} 
                  interval={window.innerWidth < 640 ? 5 : 2}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 9 }} 
                  allowDecimals={false}
                  className="text-muted-foreground"
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                    padding: '6px 10px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                  iconSize={8}
                  formatter={(value) => {
                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                      if (value === 'SpedPay') return 'SP';
                      if (value === 'Banco Inter') return 'BI';
                      if (value === 'Ativus Hub') return 'AH';
                    }
                    return value;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="spedpay" 
                  name="SpedPay"
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="inter" 
                  name="Banco Inter"
                  stroke="#F97316" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ativus" 
                  name="Ativus Hub"
                  stroke="#22C55E" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Eventos Recentes</CardTitle>
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {acquirerOptions.map(option => (
                <Button
                  key={option.value}
                  variant={acquirerFilter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAcquirerFilter(option.value)}
                  className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 whitespace-nowrap shrink-0"
                >
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.short}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {filteredEvents.length > 0 ? (
            <>
              <div className="space-y-1 sm:space-y-2">
                {paginatedEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 sm:py-2 border-b last:border-0 gap-1 sm:gap-2"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                      <Badge 
                        variant={getEventBadgeVariant(event.event_type)} 
                        className="text-[9px] sm:text-xs capitalize h-5 px-1.5"
                      >
                        {event.event_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] sm:text-sm font-medium capitalize truncate">
                        {event.acquirer}
                      </span>
                      {event.retry_attempt && (
                        <span className="text-[9px] sm:text-xs text-muted-foreground">
                          #{event.retry_attempt}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground shrink-0">
                      {event.response_time_ms && (
                        <span className="font-mono">{event.response_time_ms}ms</span>
                      )}
                      <span>{formatTime(event.created_at)}</span>
                    </div>
                    {event.error_message && (
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] text-destructive truncate max-w-full cursor-help">
                            {event.error_message.slice(0, 50)}...
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs break-words">{event.error_message}</p>
                        </TooltipContent>
                      </UITooltip>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredEvents.length)}/{filteredEvents.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[10px] sm:text-xs text-muted-foreground px-1.5 min-w-[40px] text-center">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              {acquirerFilter === 'all' ? 'Nenhum evento registrado' : `Sem eventos de ${acquirerOptions.find(o => o.value === acquirerFilter)?.label}`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
