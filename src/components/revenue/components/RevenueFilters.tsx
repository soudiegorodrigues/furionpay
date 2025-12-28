import { memo } from 'react';
import { Filter } from 'lucide-react';
import { GlobalPeriodFilter, GLOBAL_PERIOD_FILTER_OPTIONS } from '../types';
import { cn } from '@/lib/utils';

interface RevenueFiltersProps {
  filter: GlobalPeriodFilter;
  onFilterChange: (filter: GlobalPeriodFilter) => void;
}

export const RevenueFilters = memo(({ filter, onFilterChange }: RevenueFiltersProps) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline font-medium">Período:</span>
      </div>
      <div className="flex items-center bg-muted rounded-full p-1 overflow-x-auto">
        {GLOBAL_PERIOD_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap",
              filter === option.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
});

RevenueFilters.displayName = 'RevenueFilters';
