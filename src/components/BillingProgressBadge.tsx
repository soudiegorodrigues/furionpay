import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [goalAmount, setGoalAmount] = useState<number>(1000000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    const loadData = async () => {
      try {
        // Load dashboard stats for current amount (net amount after fees) - using V2 optimized function
        const { data: dashboardData } = await supabase.rpc('get_user_dashboard_v2');
        if (dashboardData) {
          const totalPaid = (dashboardData as any).total_amount_paid || 0;
          setCurrentAmount(totalPaid);
        }

        // Load global billing goal set by admin
        const { data: globalGoal } = await supabase.rpc('get_global_billing_goal');
        if (globalGoal) {
          setGoalAmount(globalGoal);
        }
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

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
