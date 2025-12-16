import { cn } from '@/lib/utils';

interface MethodBadgeProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export const MethodBadge = ({ method }: MethodBadgeProps) => {
  const colors = {
    GET: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    POST: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    PUT: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    DELETE: 'bg-red-500/20 text-red-600 dark:text-red-400',
    PATCH: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  };

  return (
    <span className={cn('px-2 py-1 rounded text-xs font-bold uppercase', colors[method])}>
      {method}
    </span>
  );
};
