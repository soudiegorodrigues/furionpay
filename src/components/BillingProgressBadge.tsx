import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isOpen, setIsOpen] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    const loadData = async () => {
      try {
        // Load dashboard stats for current amount (net amount after fees)
        const { data: dashboardData } = await supabase.rpc('get_user_dashboard');
        if (dashboardData) {
          const totalPaid = (dashboardData as any).total_amount_paid || 0;
          setCurrentAmount(totalPaid);
        }

        // Load billing goal from settings
        const { data: settings } = await supabase.rpc('get_user_settings');
        if (settings) {
          const goalSetting = (settings as any[]).find((s: any) => s.key === 'billing_goal');
          if (goalSetting?.value) {
            setGoalAmount(parseFloat(goalSetting.value));
          }
        }
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const handleSaveGoal = async () => {
    const parsedGoal = parseFloat(newGoal.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(parsedGoal) || parsedGoal <= 0) {
      toast.error("Digite um valor válido para a meta");
      return;
    }

    try {
      await supabase.rpc('update_user_setting', {
        setting_key: 'billing_goal',
        setting_value: parsedGoal.toString()
      });
      setGoalAmount(parsedGoal);
      setIsOpen(false);
      setNewGoal("");
      toast.success("Meta atualizada com sucesso!");
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error("Erro ao salvar meta");
    }
  };

  const progressPercentage = Math.min((currentAmount / goalAmount) * 100, 100);

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5 border border-border/50">
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
      
      <span className="text-sm font-medium text-foreground">
        {formatCurrency(currentAmount)} / {formatCurrency(goalAmount)}
      </span>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className="p-1 hover:bg-muted rounded-full transition-colors">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Definir Meta de Faturamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Nova meta (R$)</Label>
              <Input
                id="goal"
                type="text"
                placeholder="Ex: 1000000"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Meta atual: {formatCurrency(goalAmount)}
              </p>
            </div>
            <Button onClick={handleSaveGoal} className="w-full">
              Salvar Meta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
