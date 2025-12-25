import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FunnelCanvas } from '@/components/funnel/FunnelCanvas';
import { FunnelSidebar } from '@/components/funnel/FunnelSidebar';
import { FunnelStepConfig } from '@/components/funnel/FunnelStepConfig';
import { SalesFunnel, FunnelStep, StepType } from '@/components/funnel/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useSidebar } from '@/components/ui/sidebar';
import { Loader2, Settings, Menu, PanelRightOpen } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface FunnelBuilderSectionProps {
  productId: string;
  userId: string;
  productName: string;
  productImage?: string | null;
}

export function FunnelBuilderSection({ productId, userId, productName, productImage }: FunnelBuilderSectionProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { setOpen: setSidebarMainOpen } = useSidebar();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Collapse main sidebar when entering funnel builder
  useEffect(() => {
    setSidebarMainOpen(false);
  }, [setSidebarMainOpen]);

  // Fetch funnels
  const { data: funnels = [], isLoading } = useQuery({
    queryKey: ['sales-funnels', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_funnels')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SalesFunnel[];
    },
  });

  // Fetch steps for selected funnel
  const { data: steps = [] } = useQuery({
    queryKey: ['funnel-steps', selectedFunnelId],
    queryFn: async () => {
      if (!selectedFunnelId) return [];
      const { data, error } = await supabase
        .from('funnel_steps')
        .select('*, offer_product:products!funnel_steps_offer_product_id_fkey(id, name, price, image_url)')
        .eq('funnel_id', selectedFunnelId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data || []).map(step => ({
        ...step,
        offer_product: step.offer_product || undefined
      })) as FunnelStep[];
    },
    enabled: !!selectedFunnelId,
  });

  // Fetch products for step config
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-funnel', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
  const selectedStep = steps.find(s => s.id === selectedStepId);

  // Create funnel mutation
  const createFunnelMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('sales_funnels')
        .insert({ user_id: userId, product_id: productId, name: 'Novo Funil' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-funnels', productId] });
      setSelectedFunnelId(data.id);
      setSidebarOpen(false);
      toast.success('Funil criado!');
    },
    onError: () => toast.error('Erro ao criar funil'),
  });

  // Update funnel mutation
  const updateFunnelMutation = useMutation({
    mutationFn: async (updates: Partial<SalesFunnel>) => {
      if (!selectedFunnelId) return;
      const { error } = await supabase
        .from('sales_funnels')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', selectedFunnelId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-funnels', productId] }),
  });

  // Delete funnel mutation
  const deleteFunnelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales_funnels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-funnels', productId] });
      setSelectedFunnelId(null);
      toast.success('Funil excluído!');
    },
    onError: () => toast.error('Erro ao excluir funil'),
  });

  // Create step mutation
  const createStepMutation = useMutation({
    mutationFn: async (type: StepType) => {
      if (!selectedFunnelId) return;
      const position = steps.length;
      const { data, error } = await supabase
        .from('funnel_steps')
        .insert({ funnel_id: selectedFunnelId, step_type: type, position })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-steps', selectedFunnelId] });
      if (data) setSelectedStepId(data.id);
      toast.success('Etapa adicionada!');
    },
    onError: () => toast.error('Erro ao adicionar etapa'),
  });

  // Update step mutation
  const updateStepMutation = useMutation({
    mutationFn: async (step: FunnelStep) => {
      const { offer_product, ...updateData } = step;
      const { error } = await supabase
        .from('funnel_steps')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', step.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-steps', selectedFunnelId] });
      toast.success('Etapa atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar etapa'),
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('funnel_steps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-steps', selectedFunnelId] });
      setSelectedStepId(null);
      toast.success('Etapa excluída!');
    },
  });

  // Reorder steps mutation
  const reorderStepsMutation = useMutation({
    mutationFn: async (reorderedSteps: FunnelStep[]) => {
      const updates = reorderedSteps.map((step, index) => 
        supabase.from('funnel_steps').update({ position: index }).eq('id', step.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['funnel-steps', selectedFunnelId] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sidebarContent = (
    <FunnelSidebar
      funnels={funnels.map(f => ({ ...f, steps }))}
      selectedFunnelId={selectedFunnelId}
      onSelectFunnel={(id) => {
        setSelectedFunnelId(id);
        setSidebarOpen(false);
      }}
      onCreateFunnel={() => createFunnelMutation.mutate()}
      onDuplicateFunnel={() => toast.info('Em breve')}
      onDeleteFunnel={(id) => deleteFunnelMutation.mutate(id)}
      onRenameFunnel={() => toast.info('Edite o nome abaixo')}
      onAddStep={(type) => {
        createStepMutation.mutate(type);
        setSidebarOpen(false);
      }}
    />
  );

  const funnelConfigContent = selectedFunnel && !selectedStepId ? (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Configurações do Funil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Nome do Funil</Label>
          <Input
            value={selectedFunnel.name}
            onChange={(e) => updateFunnelMutation.mutate({ name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>URL de Origem</Label>
          <Input
            value={selectedFunnel.origin_url || ''}
            onChange={(e) => updateFunnelMutation.mutate({ origin_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label>URL Página de Obrigado</Label>
          <Input
            value={selectedFunnel.thank_you_url || ''}
            onChange={(e) => updateFunnelMutation.mutate({ thank_you_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Funil Ativo</Label>
          <Switch
            checked={selectedFunnel.is_active}
            onCheckedChange={(checked) => updateFunnelMutation.mutate({ is_active: checked })}
          />
        </div>
      </CardContent>
    </Card>
  ) : null;

  const stepConfigContent = (
    <FunnelStepConfig
      step={selectedStep || null}
      products={products}
      allSteps={steps}
      onSave={(step) => updateStepMutation.mutate(step)}
      onClose={() => setSelectedStepId(null)}
    />
  );

  return (
    <div className="space-y-4">
      {/* Mobile Header */}
      <div className="flex items-center gap-2 lg:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="h-4 w-4 mr-2" />
              Funis
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Gerenciar Funis</SheetTitle>
            </SheetHeader>
            <div className="p-4 h-[calc(100vh-64px)] overflow-auto">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
        
        {selectedFunnel && (
          <div className="flex-1 text-sm font-medium truncate">
            {selectedFunnel.name}
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[500px]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          {sidebarContent}
        </div>

        {/* Canvas + Config Area */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Canvas */}
          <Card className="flex-1">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Canvas do Funil
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedFunnelId ? (
                <FunnelCanvas
                  productName={productName}
                  productImage={productImage}
                  steps={steps}
                  selectedStepId={selectedStepId}
                  onSelectStep={setSelectedStepId}
                  onReorderSteps={(reordered) => reorderStepsMutation.mutate(reordered)}
                  onToggleStepActive={(id, active) => {
                    const step = steps.find(s => s.id === id);
                    if (step) updateStepMutation.mutate({ ...step, is_active: active });
                  }}
                  onDeleteStep={(id) => deleteStepMutation.mutate(id)}
                  onAddStep={() => createStepMutation.mutate('upsell')}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-center p-4">
                  <div>
                    <p>Selecione ou crie um funil para começar</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => isMobile ? setSidebarOpen(true) : createFunnelMutation.mutate()}
                    >
                      {isMobile ? 'Ver Funis' : 'Criar Funil'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Config Panel - Below canvas on all screens */}
          {(selectedFunnel || selectedStep) && (
            <div className="min-h-[300px]">
              {funnelConfigContent || stepConfigContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
