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
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground shrink-0">
        <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline font-medium">Período:</span>
      </div>
      <div className="flex items-center bg-muted rounded-full p-0.5 sm:p-1 overflow-x-auto scrollbar-hide">
        {GLOBAL_PERIOD_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={cn(
              "px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap",
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
