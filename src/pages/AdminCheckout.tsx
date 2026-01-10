import { useState } from "react";
import { startOfDay, endOfDay } from "date-fns";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useCheckoutOffers } from "@/hooks/useCheckoutData";
import { AccessDenied } from "@/components/AccessDenied";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, CreditCard, TrendingUp, Plus, LayoutGrid, Settings, RefreshCw } from "lucide-react";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { toast } from "@/hooks/use-toast";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";
import { DonationPopupVakinha2 } from "@/components/DonationPopupVakinha2";
import { DonationPopupVakinha3 } from "@/components/DonationPopupVakinha3";
import { DonationPopupInstituto2 } from "@/components/DonationPopupInstituto2";
import { CheckoutOfferCard } from "@/components/CheckoutOfferCard";


interface CheckoutOffer {
  id: string;
  name: string;
  domain: string;
  popup_model: string;
  product_name: string;
  meta_pixel_ids: string[];
}

const popupModels = [{
  id: "boost",
  name: "Boost",
  description: "Modelo com animações e destaque visual",
  hasDynamicAmount: false
}, {
  id: "simple",
  name: "Simples",
  description: "Modelo minimalista e direto",
  hasDynamicAmount: false
}, {
  id: "clean",
  name: "Clean",
  description: "Design limpo e moderno",
  hasDynamicAmount: false
}, {
  id: "direct",
  name: "Direto",
  description: "Foco no pagamento rápido",
  hasDynamicAmount: true
}, {
  id: "hot",
  name: "Hot",
  description: "Design com urgência e destaque",
  hasDynamicAmount: true
}, {
  id: "landing",
  name: "Modelo Vakinha",
  description: "Estilo página de vendas",
  hasDynamicAmount: false
}, {
  id: "instituto",
  name: "Borboleta",
  description: "Modelo institucional",
  hasDynamicAmount: false
}, {
  id: "vakinha2",
  name: "Vakinha 2",
  description: "Novo modelo estilo vakinha",
  hasDynamicAmount: false
}, {
  id: "vakinha3",
  name: "Vakinha 3",
  description: "Modelo baseado no Vakinha 2",
  hasDynamicAmount: false
}, {
  id: "instituto2",
  name: "Instituto 2",
  description: "Modelo institucional alternativo",
  hasDynamicAmount: false
}];

const AdminCheckout = () => {
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const { user } = useAdminAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  
  // Use React Query hook for all data - instant on second visit
  const {
    offers,
    metaPixels,
    availableDomains,
    popupStats,
    offerStats,
    isLoadingOffers,
    isRefetching,
    dataUpdatedAt,
    saveOffer,
    deleteOffer,
    refetchAll
  } = useCheckoutOffers(user?.id, dateRange);

  const handleRefresh = async () => {
    await refetchAll();
    toast({
      title: "Dados atualizados",
      description: "Os dados foram atualizados com sucesso."
    });
  };

  const formatLastUpdate = () => {
    if (!dataUpdatedAt) return null;
    const date = new Date(dataUpdatedAt);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const [localOffers, setLocalOffers] = useState<CheckoutOffer[]>([]);
  const [previewModel, setPreviewModel] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("boost");

  // Sync offers from query to local state (for temp offers)
  const displayOffers = [...localOffers.filter(o => o.id.startsWith('temp-')), ...offers];

  const handleCreateOffer = () => {
    const newOffer: CheckoutOffer = {
      id: `temp-${Date.now()}`,
      name: '',
      domain: availableDomains[0]?.domain || '',
      popup_model: 'landing',
      product_name: '',
      meta_pixel_ids: []
    };
    setLocalOffers([newOffer, ...localOffers]);
  };

  const handleSaveOffer = async (offer: CheckoutOffer) => {
    const isNew = offer.id.startsWith('temp-');
    try {
      await saveOffer(offer, isNew);
      // Remove from local offers after successful save
      if (isNew) {
        setLocalOffers(localOffers.filter(o => o.id !== offer.id));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    const isNew = offerId.startsWith('temp-');
    if (isNew) {
      setLocalOffers(localOffers.filter(o => o.id !== offerId));
      return;
    }
    await deleteOffer(offerId);
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const getStatsForModel = (modelId: string) => {
    return popupStats.find(s => s.popup_model === modelId);
  };

  // Permission check
  if (!permissionsLoading && !isOwner && !hasPermission('can_manage_checkout')) {
    return <AccessDenied message="Você não tem permissão para gerenciar o Checkout." />;
  }

  // Permission check - AFTER all hooks
  if (!permissionsLoading && !isOwner && !hasPermission('can_manage_checkout')) {
    return <AccessDenied message="Você não tem permissão para gerenciar o Checkout." />;
  }
  return <>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">​Modelos de Checkout API          </h1>
            <p className="text-sm text-muted-foreground">Modelos de popup com API     </p>
          </div>
        </div>

        <Tabs defaultValue="offers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Minhas Ofertas {!isLoadingOffers && `(${displayOffers.length})`}
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Modelos ({popupModels.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Offers */}
          <TabsContent value="offers" className="mt-4 space-y-4">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  placeholder="Filtrar por período"
                />
                <Button 
                  variant={dateRange ? "outline" : "secondary"}
                  size="sm" 
                  onClick={() => setDateRange(undefined)}
                  className="gap-2"
                >
                  Todos os tempos
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isRefetching}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                {dataUpdatedAt && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Atualizado às {formatLastUpdate()}
                  </span>
                )}
              </div>
              <Button onClick={handleCreateOffer} className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                Nova Oferta
              </Button>
            </div>

            {/* Loading skeleton - show only on first load */}
            {isLoadingOffers && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full" />
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted rounded" />
                            <div className="h-3 w-48 bg-muted rounded" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-muted rounded" />
                          <div className="w-8 h-8 bg-muted rounded" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {/* Estado vazio */}
            {!isLoadingOffers && displayOffers.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">Nenhuma oferta criada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie sua primeira oferta para gerar links de checkout
                  </p>
                  <Button onClick={handleCreateOffer} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Primeira Oferta
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Lista de ofertas - show immediately when data available */}
            {displayOffers.length > 0 && (
              <div className="space-y-4">
                {displayOffers.map(offer => {
                  const offerStat = offerStats.find(s => s.offer_id === offer.id);
                  return (
                    <CheckoutOfferCard 
                      key={offer.id} 
                      offer={offer} 
                      userId={user?.id || ''} 
                      availableDomains={availableDomains} 
                      metaPixels={metaPixels} 
                      popupModels={popupModels} 
                      popupStats={popupStats}
                      offerStats={offerStat}
                      onSave={handleSaveOffer} 
                      onDelete={handleDeleteOffer}
                      onRefresh={handleRefresh}
                      isRefreshing={isRefetching}
                      isNew={offer.id.startsWith('temp-')} 
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Models Grid */}
          <TabsContent value="models" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popupModels.map(model => {
              const stats = getStatsForModel(model.id);
              const isSelected = selectedModel === model.id;
              return <Card key={model.id} className={`transition-all cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`} onClick={() => handleSelectModel(model.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{model.name}</CardTitle>
                        </div>
                        {stats && stats.total_paid > 0 && <Badge variant="secondary" className="text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {stats.conversion_rate}%
                          </Badge>}
                      </div>
                      <CardDescription className="text-xs">{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="font-semibold text-blue-500 text-sm">{stats?.total_generated || 0}</div>
                          <div className="text-xs text-muted-foreground">PIX Gerado</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="font-semibold text-green-500 text-sm">{stats?.total_paid || 0}</div>
                          <div className="text-xs text-muted-foreground">PIX Pago</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="font-semibold text-amber-500 text-sm">{stats?.conversion_rate || 0}%</div>
                          <div className="text-xs text-muted-foreground">Taxa%</div>
                        </div>
                      </div>
                      
                      {model.hasDynamicAmount && <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                          <div className="flex items-start gap-2">
                            <span className="text-amber-500 text-sm">💡</span>
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                              <strong>Valores dinâmicos:</strong> <code className="bg-muted px-1 rounded">&amount=VALOR</code>
                            </div>
                          </div>
                        </div>}
                      
                      <Button variant="outline" size="sm" className="w-full" onClick={e => {
                    e.stopPropagation();
                    setPreviewModel(model.id);
                  }}>
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                    </CardContent>
                  </Card>;
            })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Popup Previews - Regular popups */}
      {previewModel === 'boost' && <DonationPopup isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={true} />}
      {previewModel === 'simple' && <DonationPopupSimple isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={true} />}
      {previewModel === 'clean' && <DonationPopupClean isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={true} />}
      {previewModel === 'direct' && <DonationPopupDirect isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={true} />}
      {previewModel === 'hot' && <DonationPopupHot isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={true} />}

      {/* Full-page popups wrapped in Dialog for preview */}
      <Dialog open={previewModel === 'landing'} onOpenChange={open => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto p-0">
          <DialogTitle className="sr-only">Preview Modelo Vakinha</DialogTitle>
          <div className="relative">
            <DonationPopupLanding isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={false} isPreview={true} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewModel === 'instituto'} onOpenChange={open => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto p-0">
          <DialogTitle className="sr-only">Preview Modelo Instituto</DialogTitle>
          <div className="relative">
            <DonationPopupInstituto isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={false} isPreview={true} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Vakinha2 - com Dialog igual aos outros */}
      <Dialog open={previewModel === 'vakinha2'} onOpenChange={open => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto p-0">
          <DialogTitle className="sr-only">Preview Modelo Vakinha 2</DialogTitle>
          <div className="relative">
            <DonationPopupVakinha2 isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={false} isPreview={true} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Vakinha3 - com Dialog igual aos outros */}
      <Dialog open={previewModel === 'vakinha3'} onOpenChange={open => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto p-0">
          <DialogTitle className="sr-only">Preview Modelo Vakinha 3</DialogTitle>
          <div className="relative">
            <DonationPopupVakinha3 isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={false} isPreview={true} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Instituto2 - com Dialog igual aos outros */}
      <Dialog open={previewModel === 'instituto2'} onOpenChange={open => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto p-0">
          <DialogTitle className="sr-only">Preview Modelo Instituto 2</DialogTitle>
          <div className="relative">
            <DonationPopupInstituto2 isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={false} isPreview={true} />
          </div>
        </DialogContent>
      </Dialog>
    </>;
};
export default AdminCheckout;