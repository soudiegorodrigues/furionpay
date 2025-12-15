import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Target, 
  TrendingUp,
  Loader2,
  Calendar,
  CheckCircle,
  Coins,
  PiggyBank,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  name: string;
  type: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  is_completed: boolean;
}

const GOAL_TYPES = [
  { value: 'savings', label: 'Poupança', icon: Coins, color: 'text-blue-600' },
  { value: 'investment', label: 'Investimento', icon: TrendingUp, color: 'text-purple-600' },
  { value: 'debt', label: 'Quitar Dívida', icon: Target, color: 'text-red-600' },
  { value: 'emergency', label: 'Reserva de Emergência', icon: Shield, color: 'text-green-600' },
];

export const FinanceGoals = () => {
  const { user } = useAdminAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'savings' as string,
    target_amount: '',
    current_amount: '',
    deadline: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchGoals();
    }
  }, [user?.id]);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_goals')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_completed', { ascending: true })
        .order('deadline', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: "Erro ao carregar metas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        type: goal.type,
        target_amount: goal.target_amount.toString(),
        current_amount: goal.current_amount.toString(),
        deadline: goal.deadline || ''
      });
    } else {
      setEditingGoal(null);
      setFormData({
        name: '',
        type: 'savings',
        target_amount: '',
        current_amount: '0',
        deadline: ''
      });
    }
    setShowDialog(true);
  };

  const handleOpenDeposit = (goal: Goal) => {
    setDepositGoal(goal);
    setDepositAmount('');
    setShowDepositDialog(true);
  };

  const handleDeposit = async () => {
    if (!depositGoal || !depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Valor inválido",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newAmount = depositGoal.current_amount + parseFloat(depositAmount);
      const isCompleted = newAmount >= depositGoal.target_amount;

      const { error } = await supabase
        .from('finance_goals')
        .update({
          current_amount: newAmount,
          is_completed: isCompleted
        })
        .eq('id', depositGoal.id);

      if (error) throw error;

      toast({ 
        title: isCompleted 
          ? "🎉 Parabéns! Meta atingida!" 
          : "Valor depositado!" 
      });
      setShowDepositDialog(false);
      fetchGoals();
    } catch (error) {
      console.error('Error depositing:', error);
      toast({
        title: "Erro ao depositar",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.target_amount) {
      toast({
        title: "Preencha os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const targetAmount = parseFloat(formData.target_amount);
      const currentAmount = parseFloat(formData.current_amount) || 0;
      const isCompleted = currentAmount >= targetAmount;

      const payload = {
        user_id: user!.id,
        name: formData.name,
        type: formData.type,
        target_amount: targetAmount,
        current_amount: currentAmount,
        deadline: formData.deadline || null,
        is_completed: isCompleted
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('finance_goals')
          .update(payload)
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast({ title: "Meta atualizada!" });
      } else {
        const { error } = await supabase
          .from('finance_goals')
          .insert(payload);

        if (error) throw error;
        toast({ title: "Meta criada!" });
      }

      setShowDialog(false);
      fetchGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast({
        title: "Erro ao salvar meta",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('finance_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Meta excluída!" });
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Erro ao excluir meta",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getGoalType = (type: string) => {
    return GOAL_TYPES.find(t => t.value === type) || GOAL_TYPES[0];
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline + 'T00:00:00');
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Metas Financeiras</h2>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma meta criada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira meta financeira para acompanhar seu progresso
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const goalType = getGoalType(goal.type);
            const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
            const daysRemaining = getDaysRemaining(goal.deadline);
            const GoalIcon = goalType.icon;

            return (
              <Card 
                key={goal.id} 
                className={`relative overflow-hidden ${goal.is_completed ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : ''}`}
              >
                {goal.is_completed && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-green-500 text-white gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Concluída
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${goalType.color}`}>
                      <GoalIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{goal.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{goalType.label}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Atual</p>
                      <p className="font-semibold">{formatCurrency(goal.current_amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Meta</p>
                      <p className="font-semibold">{formatCurrency(goal.target_amount)}</p>
                    </div>
                  </div>

                  {goal.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {daysRemaining !== null && daysRemaining > 0 
                          ? `${daysRemaining} dias restantes`
                          : daysRemaining === 0 
                            ? 'Vence hoje'
                            : 'Vencida'
                        }
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {!goal.is_completed && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => handleOpenDeposit(goal)}
                      >
                        <PiggyBank className="h-3 w-3" />
                        Depositar
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(goal)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Goal Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? 'Editar Meta' : 'Nova Meta'}
            </DialogTitle>
            <DialogDescription>
              {editingGoal 
                ? 'Atualize as informações da meta'
                : 'Defina uma nova meta financeira'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Meta</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Viagem de férias"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'savings' | 'investment' | 'debt' | 'emergency') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Atual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prazo (opcional)</Label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingGoal ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Depositar na Meta</DialogTitle>
            <DialogDescription>
              {depositGoal?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Faltam {formatCurrency((depositGoal?.target_amount || 0) - (depositGoal?.current_amount || 0))} para atingir a meta</p>
            </div>
            <div className="space-y-2">
              <Label>Valor do Depósito (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDeposit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Depositar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
