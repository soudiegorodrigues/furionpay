import { memo } from "react";
import { Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PerformanceIndicatorProps {
  score: number;
  totalPaid?: number;
  className?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 800) return { bg: "from-purple-500 to-amber-400", text: "text-purple-500", glow: "shadow-purple-500/30" };
  if (score >= 500) return { bg: "from-green-500 to-emerald-400", text: "text-green-500", glow: "shadow-green-500/30" };
  if (score >= 200) return { bg: "from-yellow-500 to-orange-400", text: "text-yellow-500", glow: "shadow-yellow-500/30" };
  return { bg: "from-red-500 to-rose-400", text: "text-red-500", glow: "shadow-red-500/30" };
};

const getScoreLabel = (score: number) => {
  if (score >= 800) return "Excelente";
  if (score >= 500) return "Bom";
  if (score >= 200) return "Regular";
  return "Iniciante";
};

export const PerformanceIndicator = memo(({ score, totalPaid = 0, className }: PerformanceIndicatorProps) => {
  const colors = getScoreColor(score);
  const percentage = Math.min((score / 1000) * 100, 100);

  return (
    <div className={cn("space-y-1.5 py-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "p-1 rounded-md bg-gradient-to-br",
            colors.bg,
            "shadow-lg",
            colors.glow
          )}>
            <Zap className="h-3 w-3 text-white fill-white" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Performance
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("text-sm font-bold", colors.text)}>
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
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-all duration-500",
              colors.bg
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-[10px]">
        <span className={cn("font-medium", colors.text)}>
          {getScoreLabel(score)}
        </span>
        {totalPaid > 0 && (
          <span className="text-muted-foreground">
            {totalPaid} venda{totalPaid !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
});

PerformanceIndicator.displayName = "PerformanceIndicator";
