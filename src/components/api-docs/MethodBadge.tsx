import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Pencil, Trash2, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MethodBadgeProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const methodConfig = {
  GET: {
    label: 'GET',
    description: 'Recupera dados de um recurso',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: ArrowDownRight,
  },
  POST: {
    label: 'POST',
    description: 'Cria um novo recurso',
    color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    icon: ArrowUpRight,
  },
  PUT: {
    label: 'PUT',
    description: 'Atualiza um recurso existente (substituição completa)',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: RefreshCw,
  },
  PATCH: {
    label: 'PATCH',
    description: 'Atualiza parcialmente um recurso',
    color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    icon: Pencil,
  },
  DELETE: {
    label: 'DELETE',
    description: 'Remove um recurso',
    color: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    icon: Trash2,
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export const MethodBadge = ({ method, showIcon = true, size = 'md' }: MethodBadgeProps) => {
  const config = methodConfig[method];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md font-mono font-bold border transition-colors',
            config.color,
            sizeClasses[size]
          )}
        >
          {showIcon && <Icon className={iconSizes[size]} />}
          {config.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{method}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
};
