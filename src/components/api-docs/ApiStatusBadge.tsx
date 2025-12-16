import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ApiStatus = 'operational' | 'degraded' | 'outage' | 'loading';

interface ApiStatusBadgeProps {
  className?: string;
}

export const ApiStatusBadge = ({ className }: ApiStatusBadgeProps) => {
  const [status, setStatus] = useState<ApiStatus>('loading');

  useEffect(() => {
    // Simulated status check - in production this would call an actual status endpoint
    const checkStatus = async () => {
      try {
        // Simulate API check
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStatus('operational');
      } catch {
        setStatus('degraded');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    operational: {
      icon: CheckCircle,
      label: 'Operacional',
      description: 'Todos os sistemas funcionando normalmente',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      dotColor: 'bg-emerald-500',
    },
    degraded: {
      icon: AlertCircle,
      label: 'Degradado',
      description: 'Alguns sistemas com lentidão',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      dotColor: 'bg-amber-500',
    },
    outage: {
      icon: XCircle,
      label: 'Fora do ar',
      description: 'Serviços indisponíveis',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      dotColor: 'bg-red-500',
    },
    loading: {
      icon: Loader2,
      label: 'Verificando...',
      description: 'Verificando status da API',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      dotColor: 'bg-muted-foreground',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
            config.bgColor,
            config.color,
            className
          )}
        >
          <span className={cn(
            'h-2 w-2 rounded-full',
            config.dotColor,
            status === 'loading' && 'animate-pulse',
            status === 'operational' && 'animate-pulse'
          )} />
          <span className="hidden sm:inline">{config.label}</span>
          {status === 'loading' && <Icon className="h-3 w-3 animate-spin" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="flex items-start gap-2">
          <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
          <div>
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
