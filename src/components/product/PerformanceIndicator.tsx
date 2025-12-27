import { memo } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceIndicatorProps {
  score: number;
  totalPaid?: number;
  className?: string;
}

export const PerformanceIndicator = memo(({ score, totalPaid = 0, className }: PerformanceIndicatorProps) => {
  const percentage = Math.min(score, 100);

  return (
    <div className={cn("space-y-1.5 py-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30">
            <Zap className="h-3 w-3 text-white fill-white" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Performance
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-foreground">
            {score}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Pts
          </span>
        </div>
      </div>
      
      <div className="relative">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      {totalPaid > 0 && (
        <div className="flex items-center justify-end text-[10px]">
          <span className="text-muted-foreground">
            {totalPaid} venda{totalPaid !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
});

PerformanceIndicator.displayName = "PerformanceIndicator";
