import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
  ChevronRight,
  Timer
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

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

type ChartPeriod = '24h' | '7d' | '30d';

const periodOptions = [
  { value: '24h' as ChartPeriod, label: '24h', days: 1, limit: 500 },
  { value: '7d' as ChartPeriod, label: '7d', days: 7, limit: 2000 },
  { value: '30d' as ChartPeriod, label: '30d', days: 30, limit: 5000 }
];

// Memoized custom tooltip component
interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  chartPeriod: ChartPeriod;
}

const CustomChartTooltip = memo(({ active, payload, label, chartPeriod }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  
  const dataPoint = payload[0]?.payload;
  const spedpay = dataPoint?.spedpay ?? 0;
  const inter = dataPoint?.inter ?? 0;
  const ativus = dataPoint?.ativus ?? 0;
  const total = spedpay + inter + ativus;

  const formatTooltipLabel = () => {
    if (chartPeriod === '24h') {
      return `Hoje às ${label}`;
    }
    const [day, month] = (label || '').split('/');
    const year = new Date().getFullYear();
    const date = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10));
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2 sm:p-3 text-xs sm:text-sm min-w-[160px] sm:min-w-[180px]">
      <div className="font-semibold text-foreground mb-1.5 sm:mb-2 pb-1.5 sm:pb-2 border-b border-border capitalize text-[11px] sm:text-sm">
        {formatTooltipLabel()}
      </div>
      
      <div className="space-y-1 sm:space-y-1.5">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#3B82F6]" />
            <span className="text-muted-foreground text-[10px] sm:text-xs">SpedPay</span>
          </div>
          <span className="font-semibold text-[11px] sm:text-sm">{spedpay}</span>
        </div>
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#F97316]" />
            <span className="text-muted-foreground text-[10px] sm:text-xs">Banco Inter</span>
          </div>
          <span className="font-semibold text-[11px] sm:text-sm">{inter}</span>
        </div>
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#10B981]" />
            <span className="text-muted-foreground text-[10px] sm:text-xs">Ativus Hub</span>
          </div>
          <span className="font-semibold text-[11px] sm:text-sm">{ativus}</span>
        </div>
      </div>
      
      <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border flex items-center justify-between">
        <span className="text-muted-foreground font-medium text-[10px] sm:text-xs">Total</span>
        <span className="font-bold text-foreground text-[11px] sm:text-sm">{total}</span>
      </div>
    </div>
  );
});

CustomChartTooltip.displayName = 'CustomChartTooltip';

// Memoized Acquirer Card Component
interface AcquirerCardProps {
  name: string;
  health: AcquirerHealth | null;
  getStatusColor: (health: AcquirerHealth | null) => string;
  getStatusIcon: (health: AcquirerHealth | null) => React.ReactNode;
}

const AcquirerCard = memo(({ name, health, getStatusColor, getStatusIcon }: AcquirerCardProps) => {
  const hasActivity = health && health.total_calls_24h > 0;
  
  // Card compacto para sem atividade
  if (!hasActivity) {
    return (
      <Card className="overflow-hidden w-full">
        <CardHeader className="p-2 sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <CardTitle className="text-xs sm:text-sm font-medium truncate">{name}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              N/A
            </Badge>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Sem atividade (24h)
          </p>
        </CardHeader>
      </Card>
    );
  }

  // Card completo para com atividade
  return (
    <Card className="overflow-hidden w-full">
      <CardHeader className="p-2 sm:p-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs sm:text-sm font-medium truncate">{name}</CardTitle>
          <Badge className={`${getStatusColor(health)} text-[10px] sm:text-xs shrink-0`}>
            {getStatusIcon(health)}
            <span className="ml-1">
              {health?.is_circuit_open ? 'Open' : `${health.success_rate ?? 0}%`}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 pt-0 space-y-1.5 sm:space-y-2 min-w-0">
        <div className="grid grid-cols-2 gap-1 sm:gap-1.5 text-[9px] sm:text-xs">
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
            <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">24h:</span>
            <span className="font-medium truncate">{health.total_calls_24h}</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
            <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500 shrink-0" />
            <span className="text-muted-foreground">OK:</span>
            <span className="font-medium text-green-600 truncate">{health.success_count}</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
            <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-destructive shrink-0" />
            <span className="text-muted-foreground">Falhas:</span>
            <span className="font-medium text-destructive truncate">{health.failure_count}</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
            <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500 shrink-0" />
            <span className="text-muted-foreground">Retry:</span>
            <span className="font-medium text-yellow-600 truncate">{health.retry_count}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-1.5 border-t gap-1 min-w-0">
          <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs min-w-0">
            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Média:</span>
            <span className="font-medium truncate">{health.avg_response_time ?? '-'}ms</span>
          </div>
          {health.circuit_opens > 0 && (
            <Badge variant="outline" className="text-[8px] sm:text-[9px] shrink-0 h-4 px-1">
              <AlertTriangle className="h-2 w-2 mr-0.5" />
              {health.circuit_opens}
            </Badge>
          )}
        </div>

        {health.last_failure && (
          <div className="text-[8px] sm:text-[10px] text-muted-foreground pt-0.5 truncate">
            Última falha: {new Date(health.last_failure).toLocaleString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AcquirerCard.displayName = 'AcquirerCard';

// Memoized Event Item Component
interface EventItemProps {
  event: ApiEvent;
  formatTime: (dateStr: string) => string;
  getEventBadgeVariant: (eventType: string) => "default" | "secondary" | "destructive" | "outline";
  isMobile: boolean;
}

const EventItem = memo(({ event, formatTime, getEventBadgeVariant, isMobile }: EventItemProps) => {
  if (isMobile) {
    // Mobile: Card-style layout
    return (
      <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Badge 
            variant={getEventBadgeVariant(event.event_type)} 
            className="text-[9px] capitalize h-5 px-1.5"
          >
            {event.event_type.replace('_', ' ')}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{formatTime(event.created_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium capitalize">{event.acquirer}</span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {event.retry_attempt && <span>#{event.retry_attempt}</span>}
            {event.response_time_ms && <span className="font-mono">{event.response_time_ms}ms</span>}
          </div>
        </div>
        {event.error_message && (
          <p className="text-[9px] text-destructive mt-1.5 line-clamp-2">
            {event.error_message}
          </p>
        )}
      </div>
    );
  }

  // Desktop: Row layout
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Badge 
          variant={getEventBadgeVariant(event.event_type)} 
          className="text-xs capitalize h-5 px-2"
        >
          {event.event_type.replace('_', ' ')}
        </Badge>
        <span className="text-sm font-medium capitalize">{event.acquirer}</span>
        {event.retry_attempt && (
          <span className="text-xs text-muted-foreground">#{event.retry_attempt}</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        {event.response_time_ms && (
          <span className="font-mono">{event.response_time_ms}ms</span>
        )}
        <span className="min-w-[70px]">{formatTime(event.created_at)}</span>
        {event.error_message && (
          <UITooltip>
            <TooltipTrigger asChild>
              <span className="text-destructive cursor-help max-w-[150px] truncate">
                {event.error_message.slice(0, 40)}...
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs break-words">{event.error_message}</p>
            </TooltipContent>
          </UITooltip>
        )}
      </div>
    </div>
  );
});

EventItem.displayName = 'EventItem';

export function ApiMonitoringSection() {
  const isMobile = useIsMobile();
  const [healthData, setHealthData] = useState<HealthSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<ApiEvent[]>([]);
  const [chartEvents, setChartEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [acquirerFilter, setAcquirerFilter] = useState<string>('all');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('24h');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const periodConfig = periodOptions.find(p => p.value === chartPeriod) || periodOptions[0];
      
      const [healthResult, eventsResult, chartEventsResult] = await Promise.all([
        supabase.rpc('get_api_health_summary'),
        supabase.rpc('get_recent_api_events', { p_limit: 100 }),
        supabase.rpc('get_api_events_by_period', { 
          p_days: periodConfig.days, 
          p_limit: periodConfig.limit 
        })
      ]);

      if (healthResult.error) throw healthResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (chartEventsResult.error) throw chartEventsResult.error;

      setHealthData(healthResult.data as unknown as HealthSummary);
      setRecentEvents(eventsResult.data as unknown as ApiEvent[]);
      setChartEvents(chartEventsResult.data as unknown as ApiEvent[]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching API monitoring data:', error);
      toast.error('Erro ao carregar dados de monitoramento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chartPeriod]);

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
    
    const getBrazilDate = (date: Date): string => {
      return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
    };
    
    const getBrazilHour = (date: Date): number => {
      const brazilTime = date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false });
      return parseInt(brazilTime, 10);
    };

    if (chartPeriod === '24h') {
      const hours: { [key: string]: { time: string; hour: number; spedpay: number; inter: number; ativus: number } } = {};
      
      for (let i = 23; i >= 0; i--) {
        const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
        const brazilHour = getBrazilHour(hourDate);
        const key = `${brazilHour.toString().padStart(2, '0')}h`;
        if (!hours[key]) {
          hours[key] = { time: key, hour: brazilHour, spedpay: 0, inter: 0, ativus: 0 };
        }
      }
      
      chartEvents.forEach(event => {
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
    }
    
    const days = chartPeriod === '7d' ? 7 : 30;
    const dayData: { [key: string]: { time: string; date: Date; spedpay: number; inter: number; ativus: number } } = {};
    
    for (let i = days - 1; i >= 0; i--) {
      const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = getBrazilDate(dayDate);
      dayData[key] = { time: key, date: dayDate, spedpay: 0, inter: 0, ativus: 0 };
    }
    
    chartEvents.forEach(event => {
      const eventDate = new Date(event.created_at);
      const key = getBrazilDate(eventDate);
      
      if (dayData[key]) {
        if (event.acquirer === 'spedpay') dayData[key].spedpay++;
        else if (event.acquirer === 'inter') dayData[key].inter++;
        else if (event.acquirer === 'ativus') dayData[key].ativus++;
      }
    });
    
    return Object.values(dayData).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [chartEvents, chartPeriod]);

  const getStatusColor = useCallback((health: AcquirerHealth | null) => {
    if (!health || health.total_calls_24h === 0) return "bg-muted text-muted-foreground";
    if (health.is_circuit_open) return "bg-destructive text-destructive-foreground";
    if ((health.success_rate ?? 0) >= 95) return "bg-green-500 text-white";
    if ((health.success_rate ?? 0) >= 80) return "bg-yellow-500 text-white";
    return "bg-destructive text-destructive-foreground";
  }, []);

  const getStatusIcon = useCallback((health: AcquirerHealth | null) => {
    if (!health || health.total_calls_24h === 0) return <Server className="h-3 w-3" />;
    if (health.is_circuit_open) return <AlertTriangle className="h-3 w-3" />;
    if ((health.success_rate ?? 0) >= 95) return <CheckCircle className="h-3 w-3" />;
    return <XCircle className="h-3 w-3" />;
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

  // Chart configuration based on device
  const chartConfig = useMemo(() => ({
    height: isMobile ? 160 : 220,
    interval: chartPeriod === '24h' 
      ? (isMobile ? 5 : 2)
      : chartPeriod === '7d' 
        ? 0 
        : (isMobile ? 6 : 4),
    margin: { top: 5, right: 5, left: isMobile ? -30 : -20, bottom: 5 }
  }), [isMobile, chartPeriod]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold">API Status</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-3 pb-2">
                <div className="h-4 bg-muted rounded w-20" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
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
    <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold truncate">API Status</h2>
          {lastUpdate && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
              <Timer className="h-3 w-3" />
              {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="h-7 sm:h-8 px-2 sm:px-3 shrink-0 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline ml-1.5">Atualizar</span>
        </Button>
      </div>

      {/* Acquirer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <AcquirerCard 
          name="SpedPay" 
          health={healthData?.spedpay ?? null} 
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
        <AcquirerCard 
          name="Banco Inter" 
          health={healthData?.inter ?? null}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
        <AcquirerCard 
          name="Ativus Hub" 
          health={healthData?.ativus ?? null}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      </div>

      {/* Timeline Chart + Recent Events - Side by side on desktop */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {/* Timeline Chart */}
        <Card className="h-fit">
        <CardHeader className="p-2.5 sm:p-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Timeline
            </CardTitle>
            <div className="flex gap-1">
              {periodOptions.map(option => (
                <Button
                  key={option.value}
                  variant={chartPeriod === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartPeriod(option.value)}
                  className="h-6 text-[10px] sm:text-xs px-2 min-w-[36px]"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0">
          <div style={{ height: chartConfig.height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={chartConfig.margin}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: isMobile ? 8 : 10 }} 
                  interval={chartConfig.interval}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: isMobile ? 8 : 10 }} 
                  allowDecimals={false}
                  className="text-muted-foreground"
                  width={isMobile ? 25 : 30}
                />
                <Tooltip content={<CustomChartTooltip chartPeriod={chartPeriod} />} />
                <Legend 
                  wrapperStyle={{ fontSize: isMobile ? '9px' : '11px', paddingTop: '6px' }}
                  iconSize={isMobile ? 6 : 8}
                  formatter={(value) => {
                    if (isMobile) {
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
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="inter" 
                  name="Banco Inter"
                  stroke="#F97316" 
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ativus" 
                  name="Ativus Hub"
                  stroke="#22C55E" 
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

        {/* Recent Events */}
        <Card className="h-fit">
        <CardHeader className="p-2.5 sm:p-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Eventos Recentes</CardTitle>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {acquirerOptions.map(option => (
                <Button
                  key={option.value}
                  variant={acquirerFilter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAcquirerFilter(option.value)}
                  className="h-6 text-[10px] px-2 whitespace-nowrap shrink-0 min-w-[32px]"
                >
                  {isMobile ? option.short : option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2.5 sm:p-4 pt-0">
          {filteredEvents.length > 0 ? (
            <>
              <div className={isMobile ? "space-y-2" : "space-y-0"}>
                {paginatedEvents.map(event => (
                  <EventItem
                    key={event.id}
                    event={event}
                    formatTime={formatTime}
                    getEventBadgeVariant={getEventBadgeVariant}
                    isMobile={isMobile}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t">
                  <p className="text-[10px] text-muted-foreground">
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
                    <span className="text-[10px] text-muted-foreground px-1 min-w-[36px] text-center">
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
            <p className="text-xs text-muted-foreground text-center py-6">
              {acquirerFilter === 'all' ? 'Nenhum evento registrado' : `Sem eventos de ${acquirerOptions.find(o => o.value === acquirerFilter)?.label}`}
            </p>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
