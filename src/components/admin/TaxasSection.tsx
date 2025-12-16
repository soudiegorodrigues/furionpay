import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Percent, Plus, Edit2, Trash2, Clock, X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface FeeConfig {
  id: string;
  name: string;
  pix_percentage: number;
  pix_fixed: number;
  pix_repasse_percentage: number;
  pix_repasse_days: number;
  boleto_percentage: number;
  boleto_fixed: number;
  boleto_repasse_percentage: number;
  boleto_repasse_days: number;
  cartao_percentage: number;
  cartao_fixed: number;
  cartao_repasse_percentage: number;
  cartao_repasse_days: number;
  saque_percentage: number;
  saque_fixed: number;
  is_default: boolean;
}

const defaultFeeConfig: Omit<FeeConfig, 'id'> = {
  name: '',
  pix_percentage: 6.99,
  pix_fixed: 2.49,
  pix_repasse_percentage: 15,
  pix_repasse_days: 60,
  boleto_percentage: 6.99,
  boleto_fixed: 2.49,
  boleto_repasse_percentage: 0,
  boleto_repasse_days: 2,
  cartao_percentage: 7.89,
  cartao_fixed: 2.49,
  cartao_repasse_percentage: 20,
  cartao_repasse_days: 75,
  saque_percentage: 0,
  saque_fixed: 4.99,
  is_default: false,
};

export const TaxasSection = () => {
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<FeeConfig | null>(null);
  const [formData, setFormData] = useState<Omit<FeeConfig, 'id'>>(defaultFeeConfig);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadFeeConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_configs')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFeeConfigs(data || []);
    } catch (error) {
      console.error('Error loading fee configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeeConfigs();
  }, []);

  const handleCreateNew = () => {
    setSelectedConfig(null);
    setFormData({ ...defaultFeeConfig, name: '' });
    setEditDialogOpen(true);
  };

  const handleEdit = (config: FeeConfig) => {
    setSelectedConfig(config);
    setFormData({
      name: config.name,
      pix_percentage: config.pix_percentage,
      pix_fixed: config.pix_fixed,
      pix_repasse_percentage: config.pix_repasse_percentage,
      pix_repasse_days: config.pix_repasse_days,
      boleto_percentage: config.boleto_percentage,
      boleto_fixed: config.boleto_fixed,
      boleto_repasse_percentage: config.boleto_repasse_percentage,
      boleto_repasse_days: config.boleto_repasse_days,
      cartao_percentage: config.cartao_percentage,
      cartao_fixed: config.cartao_fixed,
      cartao_repasse_percentage: config.cartao_repasse_percentage,
      cartao_repasse_days: config.cartao_repasse_days,
      saque_percentage: config.saque_percentage,
      saque_fixed: config.saque_fixed,
      is_default: config.is_default,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (config: FeeConfig) => {
    setSelectedConfig(config);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedConfig) return;

    try {
      const { error } = await supabase
        .from('fee_configs')
        .delete()
        .eq('id', selectedConfig.id);

      if (error) throw error;

      toast({
        title: "Taxa excluída",
        description: "A configuração de taxa foi excluída com sucesso.",
      });

      loadFeeConfigs();
    } catch (error) {
      console.error('Error deleting fee config:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a taxa.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedConfig(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a taxa.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (selectedConfig) {
        // Update existing
        const { error } = await supabase
          .from('fee_configs')
          .update(formData)
          .eq('id', selectedConfig.id);

        if (error) throw error;

        toast({
          title: "Taxa atualizada",
          description: "A configuração de taxa foi atualizada com sucesso.",
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('fee_configs')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Taxa criada",
          description: "A nova configuração de taxa foi criada com sucesso.",
        });
      }

      setEditDialogOpen(false);
      loadFeeConfigs();
    } catch (error) {
      console.error('Error saving fee config:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a taxa.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2).replace('.', ',')}%`;
  };

  const FeeRow = ({ label, percentage, fixed, repassePercentage, repasseDays }: {
    label: string;
    percentage: number;
    fixed: number;
    repassePercentage?: number;
    repasseDays?: number;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="font-medium text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{formatPercentage(percentage)}</span>
        <span className="text-xs font-medium">{formatCurrency(fixed)}</span>
        {repassePercentage !== undefined && repasseDays !== undefined && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            <Clock className="h-2.5 w-2.5" />
            {repassePercentage}% | D+{repasseDays}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Taxas
          </CardTitle>
          <p className="text-sm text-muted-foreground">Configurar taxas de transação</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold">Controle de Taxas</h3>
            <Button onClick={handleCreateNew} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Criar nova taxa
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : feeConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma taxa configurada. Clique em "Criar nova taxa" para começar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {feeConfigs.map((config) => (
                <Card key={config.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-1 px-4 pt-3">
                    <CardTitle className="text-sm text-primary">
                      {config.name}
                      {config.is_default && (
                        <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Padrão
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0 px-4 pb-3">
                    <FeeRow
                      label="PIX"
                      percentage={config.pix_percentage}
                      fixed={config.pix_fixed}
                      repassePercentage={config.pix_repasse_percentage}
                      repasseDays={config.pix_repasse_days}
                    />
                    <FeeRow
                      label="BOLETO"
                      percentage={config.boleto_percentage}
                      fixed={config.boleto_fixed}
                      repassePercentage={config.boleto_repasse_percentage}
                      repasseDays={config.boleto_repasse_days}
                    />
                    <FeeRow
                      label="CARTÃO"
                      percentage={config.cartao_percentage}
                      fixed={config.cartao_fixed}
                      repassePercentage={config.cartao_repasse_percentage}
                      repasseDays={config.cartao_repasse_days}
                    />
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-xs">SAQUE</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{formatPercentage(config.saque_percentage)}</span>
                        <span className="text-xs font-medium">{formatCurrency(config.saque_fixed)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1 text-xs h-8"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Editar
                      </Button>
                      {!config.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive h-8 px-2"
                          onClick={() => handleDelete(config)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedConfig ? 'Editar Taxa' : 'Criar Nova Taxa'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="name">Nome da Taxa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Produtor, Sociedade, etc."
              />
            </div>

            {/* PIX */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">PIX</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pix_percentage}
                    onChange={(e) => setFormData({ ...formData, pix_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pix_fixed}
                    onChange={(e) => setFormData({ ...formData, pix_fixed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Repasse (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.pix_repasse_percentage}
                    onChange={(e) => setFormData({ ...formData, pix_repasse_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Prazo (D+)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.pix_repasse_days}
                    onChange={(e) => setFormData({ ...formData, pix_repasse_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* BOLETO */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">BOLETO</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.boleto_percentage}
                    onChange={(e) => setFormData({ ...formData, boleto_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.boleto_fixed}
                    onChange={(e) => setFormData({ ...formData, boleto_fixed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Repasse (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.boleto_repasse_percentage}
                    onChange={(e) => setFormData({ ...formData, boleto_repasse_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Prazo (D+)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.boleto_repasse_days}
                    onChange={(e) => setFormData({ ...formData, boleto_repasse_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* CARTÃO */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">CARTÃO</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cartao_percentage}
                    onChange={(e) => setFormData({ ...formData, cartao_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cartao_fixed}
                    onChange={(e) => setFormData({ ...formData, cartao_fixed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Repasse (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.cartao_repasse_percentage}
                    onChange={(e) => setFormData({ ...formData, cartao_repasse_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Prazo (D+)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.cartao_repasse_days}
                    onChange={(e) => setFormData({ ...formData, cartao_repasse_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* SAQUE */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">TAXA DE SAQUE</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.saque_percentage}
                    onChange={(e) => setFormData({ ...formData, saque_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.saque_fixed}
                    onChange={(e) => setFormData({ ...formData, saque_fixed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Taxa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a taxa "{selectedConfig?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
