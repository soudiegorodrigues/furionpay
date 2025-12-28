import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Target, Goal, Pencil, Check, Trophy, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ProfitStats } from '../types';
import { formatCurrency } from '../utils';
import { cn } from '@/lib/utils';

interface MonthlyGoalTrackerProps {
  stats: ProfitStats;
  monthlyGoal: number;
  onSaveGoal: (goal: number) => Promise<boolean>;
}

export const MonthlyGoalTracker = memo(({ stats, monthlyGoal, onSaveGoal }: MonthlyGoalTrackerProps) => {
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const handleSaveGoal = async () => {
    const newGoal = parseFloat(goalInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const success = await onSaveGoal(newGoal);
    if (success) {
      setIsGoalDialogOpen(false);
    }
  };

  const goalProgress = monthlyGoal > 0 ? Math.min((stats.thisMonth / monthlyGoal) * 100, 100) : 0;
  const isGoalAchieved = monthlyGoal > 0 && stats.thisMonth >= monthlyGoal;
  const remaining = monthlyGoal - stats.thisMonth;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Projeção Mensal */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            Projeção Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-background/50 rounded-xl border border-border/50">
              <div className="text-lg font-bold text-foreground">
                {formatCurrency(stats.averageDailyProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Média Diária</p>
              <p className="text-[10px] text-muted-foreground">(últimos 7 dias)</p>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-xl border border-primary/20">
              <div className="text-lg font-bold text-primary">
                {formatCurrency(stats.monthlyProjection)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Projeção Mensal</p>
              <p className="text-[10px] text-muted-foreground">(média × 30 dias)</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-xl border border-border/50">
              <div className={cn(
                "text-lg font-bold flex items-center justify-center gap-1",
                stats.monthOverMonthChange > 0 ? "text-emerald-500" : 
                stats.monthOverMonthChange < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {stats.monthOverMonthChange > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : stats.monthOverMonthChange < 0 ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : null}
                {Math.abs(stats.monthOverMonthChange).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tendência</p>
              <p className="text-[10px] text-muted-foreground">
                {stats.monthOverMonthChange > 0 ? "em alta" : 
                 stats.monthOverMonthChange < 0 ? "em queda" : "estável"}
              </p>
            </div>
          </div>
          {stats.daysWithData === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Sem dados suficientes para projeção.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Meta Mensal */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Goal className="h-4 w-4 text-emerald-500" />
            </div>
            Meta Mensal
          </CardTitle>
          <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-xs"
                onClick={() => setGoalInput(monthlyGoal.toString())}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Meta Mensal de Lucro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Meta de lucro mensal (R$)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: 10000"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveGoal} className="w-full">
                  <Check className="h-4 w-4 mr-2" />
                  Salvar Meta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {monthlyGoal > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className={cn(
                  "font-semibold",
                  isGoalAchieved ? "text-emerald-500" : "text-foreground"
                )}>
                  {goalProgress.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={goalProgress} 
                className={cn(
                  "h-3",
                  isGoalAchieved && "[&>div]:bg-emerald-500"
                )}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(stats.thisMonth)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de {formatCurrency(monthlyGoal)}
                  </p>
                </div>
                {isGoalAchieved ? (
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Trophy className="h-5 w-5" />
                    <span className="text-sm font-semibold">Meta atingida!</span>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      Faltam
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Goal className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-3">
                Defina uma meta mensal para acompanhar seu progresso
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsGoalDialogOpen(true)}
              >
                <Target className="h-4 w-4 mr-2" />
                Definir Meta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

MonthlyGoalTracker.displayName = 'MonthlyGoalTracker';
