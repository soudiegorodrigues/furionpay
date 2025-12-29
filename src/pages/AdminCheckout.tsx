import { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, CreditCard, TrendingUp, Plus, LayoutGrid, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";
import { CheckoutOfferCard } from "@/components/CheckoutOfferCard";
interface PopupModelStats {
  popup_model: string;
  total_generated: number;
  total_paid: number;
  conversion_rate: number;
}
interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}
interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken: string;
}
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
  name: "Instituto",
  description: "Modelo institucional",
  hasDynamicAmount: false
}];
const AdminCheckout = () => {
  const {
    isOwner,
    hasPermission,
    loading: permissionsLoading
  } = usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [popupStats, setPopupStats] = useState<PopupModelStats[]>([]);
  const [previewModel, setPreviewModel] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("boost");
  const [availableDomains, setAvailableDomains] = useState<AvailableDomain[]>([]);
  const [metaPixels, setMetaPixels] = useState<MetaPixel[]>([]);
  const [offers, setOffers] = useState<CheckoutOffer[]>([]);
  const {
    isAuthenticated,
    user
  } = useAdminAuth();
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);
  const loadData = async () => {
    setIsLoading(false); // Remove loading state immediately

    try {
      // Load all data in parallel for faster loading
      const [offersResult, statsResult, domainsResult, settingsResult] = await Promise.all([supabase.from('checkout_offers').select('*').order('created_at', {
        ascending: false
      }), supabase.rpc('get_user_popup_model_stats'), supabase.from('available_domains').select('id, domain, name').eq('is_active', true).eq('domain_type', 'checkout').order('domain'), supabase.rpc('get_user_settings')]);

      // Parse meta pixels first
      let parsedPixels: MetaPixel[] = [];
      if (settingsResult.data) {
        const settings = settingsResult.data as {
          key: string;
          value: string;
        }[];
        const pixelsSetting = settings.find(s => s.key === 'meta_pixels');
        if (pixelsSetting?.value) {
          try {
            const parsed = JSON.parse(pixelsSetting.value);
            parsedPixels = Array.isArray(parsed) ? parsed : [];
          } catch {
            parsedPixels = [];
          }
        }
      }
      setMetaPixels(parsedPixels);

      // Get valid pixel IDs
      const validPixelIds = new Set(parsedPixels.map(p => p.id));

      // Process offers and clean invalid pixel IDs
      if (!offersResult.error && offersResult.data) {
        const processedOffers: CheckoutOffer[] = [];
        const offersToUpdate: {
          id: string;
          validIds: string[];
        }[] = [];
        for (const o of offersResult.data) {
          const currentPixelIds = o.meta_pixel_ids || [];
          const validIds = currentPixelIds.filter((id: string) => validPixelIds.has(id));

          // Check if any invalid pixels were removed
          if (validIds.length !== currentPixelIds.length && !o.id.startsWith('temp-')) {
            offersToUpdate.push({
              id: o.id,
              validIds
            });
          }
          processedOffers.push({
            id: o.id,
            name: o.name,
            domain: o.domain || '',
            popup_model: o.popup_model || 'landing',
            product_name: o.product_name || '',
            meta_pixel_ids: validIds
          });
        }
        setOffers(processedOffers);

        // Update offers with invalid pixels in background
        if (offersToUpdate.length > 0) {
          Promise.all(offersToUpdate.map(({
            id,
            validIds
          }) => supabase.from('checkout_offers').update({
            meta_pixel_ids: validIds
          }).eq('id', id))).then(() => {
            console.log('Cleaned invalid pixel IDs from offers');
          });
        }
      }

      // Set other data
      setPopupStats(statsResult.data || []);
      setAvailableDomains(domainsResult.data || []);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setHasLoaded(true);
    }
  };
  const handleCreateOffer = () => {
    const newOffer: CheckoutOffer = {
      id: `temp-${Date.now()}`,
      name: '',
      domain: availableDomains[0]?.domain || '',
      popup_model: 'landing',
      product_name: '',
      meta_pixel_ids: []
    };
    setOffers([newOffer, ...offers]);
  };
  const handleSaveOffer = async (offer: CheckoutOffer) => {
    const isNew = offer.id.startsWith('temp-');
    try {
      if (isNew) {
        const {
          data,
          error
        } = await supabase.from('checkout_offers').insert({
          user_id: user?.id,
          name: offer.name,
          domain: offer.domain || null,
          popup_model: offer.popup_model,
          product_name: offer.product_name || null,
          meta_pixel_ids: offer.meta_pixel_ids || []
        }).select().single();
        if (error) throw error;
        setOffers(offers.map(o => o.id === offer.id ? {
          ...offer,
          id: data.id
        } : o));
        toast({
          title: "Oferta criada!",
          description: "Sua nova oferta foi salva com sucesso."
        });
      } else {
        const {
          error
        } = await supabase.from('checkout_offers').update({
          name: offer.name,
          domain: offer.domain || null,
          popup_model: offer.popup_model,
          product_name: offer.product_name || null,
          meta_pixel_ids: offer.meta_pixel_ids || []
        }).eq('id', offer.id);
        if (error) throw error;
        setOffers(offers.map(o => o.id === offer.id ? offer : o));
        toast({
          title: "Oferta atualizada!",
          description: "As alterações foram salvas com sucesso."
        });
      }
    } catch (error) {
      console.error('Error saving offer:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar oferta",
        variant: "destructive"
      });
      throw error;
    }
  };
  const handleDeleteOffer = async (offerId: string) => {
    const isNew = offerId.startsWith('temp-');
    if (isNew) {
      setOffers(offers.filter(o => o.id !== offerId));
      return;
    }
    try {
      const {
        error
      } = await supabase.from('checkout_offers').delete().eq('id', offerId);
      if (error) throw error;
      setOffers(offers.filter(o => o.id !== offerId));
      toast({
        title: "Oferta excluída",
        description: "A oferta foi removida com sucesso."
      });
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir oferta",
        variant: "destructive"
      });
    }
  };
  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
  };
  const getStatsForModel = (modelId: string) => {
    return popupStats.find(s => s.popup_model === modelId);
  };

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
              Minhas Ofertas {!isLoading && `(${offers.length})`}
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Modelos ({popupModels.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Offers */}
          <TabsContent value="offers" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreateOffer} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Oferta
              </Button>
            </div>

            {offers.length === 0 && hasLoaded && <Card className="border-dashed">
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
              </Card>}

            <div className="space-y-4">
              {offers.map(offer => <CheckoutOfferCard key={offer.id} offer={offer} userId={user?.id || ''} availableDomains={availableDomains} metaPixels={metaPixels} popupModels={popupModels} onSave={handleSaveOffer} onDelete={handleDeleteOffer} isNew={offer.id.startsWith('temp-')} />)}
            </div>
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
                          <div className="text-xs text-muted-foreground">Gerados</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="font-semibold text-green-500 text-sm">{stats?.total_paid || 0}</div>
                          <div className="text-xs text-muted-foreground">Pagos</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="font-semibold text-amber-500 text-sm">{stats?.conversion_rate || 0}%</div>
                          <div className="text-xs text-muted-foreground">Conversão</div>
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
          <div className="relative">
            <DonationPopupLanding isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={false} isPreview={true} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewModel === 'instituto'} onOpenChange={open => !open && setPreviewModel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto p-0">
          <div className="relative">
            <DonationPopupInstituto isOpen={true} onClose={() => setPreviewModel(null)} userId={user?.id} showCloseButton={false} isPreview={true} />
          </div>
        </DialogContent>
      </Dialog>
    </>;
};
export default AdminCheckout;