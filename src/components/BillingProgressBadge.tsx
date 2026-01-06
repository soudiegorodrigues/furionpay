import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useBillingProgress } from "@/hooks/useAuthSession";

interface BillingProgressBadgeProps {
  userId?: string;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.0', '')}K`;
  }
  return `R$ ${value.toFixed(0)}`;
};

export function BillingProgressBadge({ userId }: BillingProgressBadgeProps) {
  const { currentAmount, goalAmount, loading } = useBillingProgress(userId);
  const progressPercentage = Math.min((currentAmount / goalAmount) * 100, 100);

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1.5 border border-primary/20 min-w-fit">
      <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 bg-background">
        Faturamento
      </Badge>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">
              Progresso até sua meta de faturamento líquido.
              <br />
              <span className="text-muted-foreground">
                {progressPercentage.toFixed(1)}% concluído
              </span>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <span className="text-sm font-medium text-foreground whitespace-nowrap">
        {formatCurrency(currentAmount)} / {formatCurrency(goalAmount)}
      </span>
    </div>
  );
}
