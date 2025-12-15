import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, GripVertical, RefreshCcw, AlertTriangle, Check, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RetryConfig {
  id: string;
  payment_method: string;
  enabled: boolean;
  max_retries: number;
  acquirer_order: string[];
  delay_between_retries_ms: number;
}

const acquirerLabels: Record<string, string> = {
  ativus: 'Ativus Hub',
  spedpay: 'SpedPay',
  inter: 'Banco Inter'
};

export const RetryConfigSection = () => {
  const [configs, setConfigs] = useState<RetryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pix');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);
  
  // Editable state
  const [editedConfig, setEditedConfig] = useState<Partial<RetryConfig>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    // Initialize edited config when configs load or tab changes
    const currentConfig = configs.find(c => c.payment_method === activeTab);
    if (currentConfig) {
      setEditedConfig({
        enabled: currentConfig.enabled,
        max_retries: currentConfig.max_retries,
        acquirer_order: [...currentConfig.acquirer_order],
        delay_between_retries_ms: currentConfig.delay_between_retries_ms
      });
    } else {
      setEditedConfig({
        enabled: true,
        max_retries: 5,
        acquirer_order: ['ativus', 'spedpay', 'inter'],
        delay_between_retries_ms: 1000
      });
    }
  }, [configs, activeTab]);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('retry_configurations')
        .select('*');
      
      if (error) throw error;
      
      setConfigs(data || []);
    } catch (error) {
      console.error('Error loading retry configs:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações de retry",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const currentConfig = configs.find(c => c.payment_method === activeTab);
      
      if (currentConfig) {
        // Update existing
        const { error } = await supabase
          .from('retry_configurations')
          .update({
            enabled: editedConfig.enabled,
            max_retries: editedConfig.max_retries,
            acquirer_order: editedConfig.acquirer_order,
            delay_between_retries_ms: editedConfig.delay_between_retries_ms
          })
          .eq('id', currentConfig.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('retry_configurations')
          .insert({
            payment_method: activeTab,
            enabled: editedConfig.enabled ?? true,
            max_retries: editedConfig.max_retries ?? 5,
            acquirer_order: editedConfig.acquirer_order ?? ['ativus', 'spedpay', 'inter'],
            delay_between_retries_ms: editedConfig.delay_between_retries_ms ?? 1000
          });
        
        if (error) throw error;
      }
      
      toast({
        title: "Sucesso",
        description: "Configuração de retry salva!"
      });
      
      loadConfigs();
    } catch (error) {
      console.error('Error saving retry config:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configuração",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteConfig = async () => {
    if (!configToDelete) return;
    
    try {
      const { error } = await supabase
        .from('retry_configurations')
        .delete()
        .eq('id', configToDelete);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Configuração excluída!"
      });
      
      setShowDeleteDialog(false);
      setConfigToDelete(null);
      loadConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir configuração",
        variant: "destructive"
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newOrder = [...(editedConfig.acquirer_order || [])];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setEditedConfig(prev => ({ ...prev, acquirer_order: newOrder }));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const currentConfig = configs.find(c => c.payment_method === activeTab);
  const hasChanges = currentConfig ? (
    editedConfig.enabled !== currentConfig.enabled ||
    editedConfig.max_retries !== currentConfig.max_retries ||
    editedConfig.delay_between_retries_ms !== currentConfig.delay_between_retries_ms ||
    JSON.stringify(editedConfig.acquirer_order) !== JSON.stringify(currentConfig.acquirer_order)
  ) : true;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCcw className="w-4 h-4" />
              Configuração de Retentativas
            </CardTitle>
            <CardDescription className="text-sm">
              Configure as tentativas automáticas de reprocessamento para pagamentos.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pix" className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              PIX
            </TabsTrigger>
            <TabsTrigger value="card" disabled className="flex items-center gap-1.5 opacity-50">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              CARTÃO
            </TabsTrigger>
            <TabsTrigger value="boleto" disabled className="flex items-center gap-1.5 opacity-50">
              <div className="w-3 h-3 bg-amber-500 rounded" />
              BOLETO
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-4">
                  {/* Enable/Disable + Max Retries */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editedConfig.enabled ?? true}
                        onCheckedChange={(checked) => setEditedConfig(prev => ({ ...prev, enabled: checked }))}
                      />
                      <span className="text-sm font-medium">
                        {editedConfig.enabled ? 'Retentativas Ativas' : 'Retentativas Desativadas'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Máximo:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={editedConfig.max_retries ?? 5}
                        onChange={(e) => setEditedConfig(prev => ({ 
                          ...prev, 
                          max_retries: Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                        }))}
                        className="w-16 h-8 text-center"
                        disabled={!editedConfig.enabled}
                      />
                      <span className="text-xs text-muted-foreground">tentativas</span>
                    </div>
                  </div>

                  {/* Acquirer Order */}
                  <div className="space-y-2">
                    <Label className="text-sm">Ordem de Fallback (arrastar para reordenar):</Label>
                    <div className="space-y-1.5">
                      {(editedConfig.acquirer_order || ['ativus', 'spedpay', 'inter']).map((acquirer, index) => (
                        <div
                          key={acquirer}
                          draggable={editedConfig.enabled}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`
                            flex items-center justify-between p-2.5 rounded-lg border transition-all
                            ${editedConfig.enabled ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'}
                            ${draggedIndex === index ? 'ring-2 ring-primary bg-muted/50' : ''}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <div className={`
                              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                            `}>
                              {index + 1}
                            </div>
                            <span className="font-medium">{acquirerLabels[acquirer] || acquirer}</span>
                          </div>
                          <Badge variant={index === 0 ? 'default' : 'outline'} className="text-xs">
                            {index === 0 ? 'Principal' : `Fallback ${index}`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delay */}
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <Label className="text-sm whitespace-nowrap">Delay entre tentativas:</Label>
                    <Input
                      type="number"
                      min={500}
                      max={10000}
                      step={100}
                      value={editedConfig.delay_between_retries_ms ?? 1000}
                      onChange={(e) => setEditedConfig(prev => ({ 
                        ...prev, 
                        delay_between_retries_ms: Math.min(10000, Math.max(500, parseInt(e.target.value) || 1000))
                      }))}
                      className="w-24 h-8 text-center"
                      disabled={!editedConfig.enabled}
                    />
                    <span className="text-sm text-muted-foreground">ms</span>
                  </div>

                  {/* Info Box */}
                  {editedConfig.enabled && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Se a adquirente principal falhar, o sistema tentará automaticamente 
                        as próximas na ordem configurada, até {editedConfig.max_retries} tentativas 
                        no total, com {editedConfig.delay_between_retries_ms}ms de intervalo.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    {currentConfig && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfigToDelete(currentConfig.id);
                          setShowDeleteDialog(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Excluir
                      </Button>
                    )}
                    <Button
                      onClick={saveConfig}
                      disabled={isSaving || !hasChanges}
                      className="ml-auto"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Configuração
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Configuração?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O sistema voltará ao comportamento padrão (sem retry automático).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteConfig} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
