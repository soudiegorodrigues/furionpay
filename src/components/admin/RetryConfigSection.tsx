import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, ArrowRight, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RetryStep {
  id: string;
  payment_method: string;
  step_order: number;
  acquirer: string;
  is_active: boolean;
}

const ACQUIRERS = [
  { value: 'ativus', label: 'Ativus Hub', color: 'bg-purple-500' },
  { value: 'spedpay', label: 'SpedPay', color: 'bg-blue-500' },
  { value: 'inter', label: 'Banco Inter', color: 'bg-orange-500' },
];

const ACQUIRER_LABELS: Record<string, string> = {
  ativus: 'ATIVUS HUB',
  spedpay: 'SPEDPAY',
  inter: 'BANCO INTER',
};

const ACQUIRER_COLORS: Record<string, string> = {
  ativus: 'bg-purple-500',
  spedpay: 'bg-blue-500',
  inter: 'bg-orange-500',
};

interface AcquirerStats {
  success: number;
  failure: number;
  retry: number;
}

export const RetryConfigSection = () => {
  const [steps, setSteps] = useState<RetryStep[]>([]);
  const [stats, setStats] = useState<Record<string, AcquirerStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pix");
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<RetryStep | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingStep, setDeletingStep] = useState<RetryStep | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    step_order: 1,
    acquirer: 'ativus',
    is_active: true,
  });

  useEffect(() => {
    loadSteps();
    loadStats();
  }, []);

  const loadSteps = async () => {
    try {
      const { data, error } = await supabase
        .from('retry_flow_steps')
        .select('*')
        .order('step_order', { ascending: true });

      if (error) throw error;
      setSteps((data as RetryStep[]) || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: events, error } = await supabase
        .rpc('get_recent_api_events', { p_limit: 500 });

      if (error) throw error;

      const acquirers = ['spedpay', 'inter', 'ativus'];
      const processedStats: Record<string, AcquirerStats> = {};
      
      acquirers.forEach(acquirer => {
        const acquirerEvents = (events || []).filter((e: any) => e.acquirer === acquirer);
        processedStats[acquirer] = {
          success: acquirerEvents.filter((e: any) => e.event_type === 'success').length,
          failure: acquirerEvents.filter((e: any) => e.event_type === 'failure').length,
          retry: acquirerEvents.filter((e: any) => e.event_type === 'retry').length,
        };
      });

      setStats(processedStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const getNextOrder = () => {
    const pixSteps = steps.filter(s => s.payment_method === 'pix');
    if (pixSteps.length === 0) return 1;
    return Math.max(...pixSteps.map(s => s.step_order)) + 1;
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('retry_flow_steps')
        .insert({
          payment_method: 'pix',
          step_order: formData.step_order,
          acquirer: formData.acquirer,
          is_active: formData.is_active,
        });

      if (error) throw error;
      
      toast.success('Etapa criada com sucesso');
      setIsCreateOpen(false);
      loadSteps();
    } catch (error: any) {
      console.error('Erro ao criar etapa:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma etapa com esta ordem');
      } else {
        toast.error('Erro ao criar etapa');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingStep) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('retry_flow_steps')
        .update({
          step_order: formData.step_order,
          acquirer: formData.acquirer,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingStep.id);

      if (error) throw error;
      
      toast.success('Etapa atualizada com sucesso');
      setIsEditOpen(false);
      setEditingStep(null);
      loadSteps();
    } catch (error: any) {
      console.error('Erro ao atualizar etapa:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma etapa com esta ordem');
      } else {
        toast.error('Erro ao atualizar etapa');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStep) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('retry_flow_steps')
        .delete()
        .eq('id', deletingStep.id);

      if (error) throw error;
      
      toast.success('Etapa excluída com sucesso');
      setDeleteConfirmOpen(false);
      setDeletingStep(null);
      loadSteps();
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      toast.error('Erro ao excluir etapa');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setFormData({
      step_order: getNextOrder(),
      acquirer: 'ativus',
      is_active: true,
    });
    setIsCreateOpen(true);
  };

  const openEdit = (step: RetryStep) => {
    setEditingStep(step);
    setFormData({
      step_order: step.step_order,
      acquirer: step.acquirer,
      is_active: step.is_active,
    });
    setIsEditOpen(true);
  };

  const pixSteps = steps.filter(s => s.payment_method === 'pix').sort((a, b) => a.step_order - b.step_order);
  const activeCount = pixSteps.filter(s => s.is_active).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Configuração de Retentativas
              </CardTitle>
              <CardDescription className="mt-1">
                Configure as tentativas automáticas de reprocessamento para pagamentos com falha.
              </CardDescription>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Configuração
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pix" className="gap-2">
            PIX
            <Badge variant="secondary" className="ml-1">
              {activeCount} ativa{activeCount !== 1 ? 's' : ''}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pix" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <CardTitle className="text-base">Fluxo de Retentativas</CardTitle>
                <Badge variant="outline">{pixSteps.length} etapa{pixSteps.length !== 1 ? 's' : ''}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pixSteps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma etapa configurada.</p>
                  <p className="text-sm mt-1">Clique em "Nova Configuração" para adicionar.</p>
                </div>
              ) : (
                pixSteps.map((step, index) => {
                  const isLast = index === pixSteps.length - 1;
                  
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        step.is_active 
                          ? 'bg-card border-border' 
                          : 'bg-muted/30 border-border/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Order number */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${ACQUIRER_COLORS[step.acquirer] || 'bg-gray-500'}`}>
                          {step.step_order}
                        </div>
                        
                        {/* Acquirer name */}
                        <div>
                          <p className="font-semibold">{ACQUIRER_LABELS[step.acquirer] || step.acquirer.toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {step.is_active ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                      </div>

                      {/* Flow indicators with stats */}
                      <div className="hidden md:flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <span>Sucesso?</span>
                          <ArrowRight className="h-3 w-3" />
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">FIM</span>
                          <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {stats[step.acquirer]?.success ?? 0}
                          </Badge>
                        </div>
                        
                        <div className={`flex items-center gap-2 ${isLast ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          <span>Falha?</span>
                          <ArrowRight className="h-3 w-3" />
                          {isLast ? (
                            <>
                              <XCircle className="h-4 w-4" />
                              <span className="font-medium">ERRO</span>
                              <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                {stats[step.acquirer]?.failure ?? 0}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <span className="font-medium">Próximo</span>
                              <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                {stats[step.acquirer]?.failure ?? 0}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(step)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingStep(step);
                            setDeleteConfirmOpen(true);
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Legend */}
              {pixSteps.length > 0 && (
                <div className="flex flex-wrap gap-4 pt-4 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Sucesso = Pagamento aprovado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>Falha = Tenta próxima adquirente</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Erro final = Todas falharam</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Configuração de Retentativa</DialogTitle>
            <DialogDescription>
              Adicione uma nova etapa ao fluxo de retentativas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="order">Ordem *</Label>
              <Input
                id="order"
                type="number"
                min={1}
                value={formData.step_order}
                onChange={(e) => setFormData({ ...formData, step_order: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">
                1 = primeira tentativa, 2 = segunda, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Método</Label>
              <Select value="pix" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      PIX
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adquirente *</Label>
              <Select
                value={formData.acquirer}
                onValueChange={(value) => setFormData({ ...formData, acquirer: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACQUIRERS.map((acq) => (
                    <SelectItem key={acq.value} value={acq.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${acq.color}`} />
                        {acq.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Ativo</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Configuração</DialogTitle>
            <DialogDescription>
              Modifique a etapa do fluxo de retentativas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-order">Ordem *</Label>
              <Input
                id="edit-order"
                type="number"
                min={1}
                value={formData.step_order}
                onChange={(e) => setFormData({ ...formData, step_order: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Adquirente *</Label>
              <Select
                value={formData.acquirer}
                onValueChange={(value) => setFormData({ ...formData, acquirer: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACQUIRERS.map((acq) => (
                    <SelectItem key={acq.value} value={acq.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${acq.color}`} />
                        {acq.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Ativo</Label>
              <Switch
                id="edit-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A etapa será removida do fluxo de retentativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};