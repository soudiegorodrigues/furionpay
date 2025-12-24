import { useState, useEffect } from "react";
import { Puzzle, Settings, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UtmifySection, UtmifyInitialData } from "@/components/admin/UtmifySection";
import { ApiKeysSection } from "@/components/admin/ApiKeysSection";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import utmifyLogo from "@/assets/utmify-logo.png";
import apiLogo from "@/assets/api-logo.webp";
import { supabase } from "@/integrations/supabase/client";

const AdminIntegrations = () => {
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const [utmifyDialogOpen, setUtmifyDialogOpen] = useState(false);
  const [utmifyConfigured, setUtmifyConfigured] = useState(false);
  const [utmifyEnabled, setUtmifyEnabled] = useState(false);
  const [loadingUtmify, setLoadingUtmify] = useState(false);
  const [loadingUtmifyStatus, setLoadingUtmifyStatus] = useState(true);
  const [utmifyInitialData, setUtmifyInitialData] = useState<UtmifyInitialData | null>(null);

  // API Keys state
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [apiKeysCount, setApiKeysCount] = useState(0);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);

  // Preload images for instant rendering
  useEffect(() => {
    const preloadImage = (src: string) => {
      const img = new Image();
      img.src = src;
    };
    preloadImage(utmifyLogo);
    preloadImage(apiLogo);
  }, []);

  useEffect(() => {
    loadUtmifyStatus();
    loadApiKeysStatus();
  }, []);

  const loadUtmifyStatus = async () => {
    setLoadingUtmifyStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokenData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'utmify_api_token')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: enabledData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'utmify_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      setUtmifyConfigured(!!tokenData?.value);
      setUtmifyEnabled(enabledData?.value === 'true');
    } catch (error) {
      console.error('Error loading Utmify status:', error);
    } finally {
      setLoadingUtmifyStatus(false);
    }
  };

  const loadApiKeysStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_api_clients');
      if (error) throw error;
      const activeCount = (data || []).filter((client: { is_active: boolean }) => client.is_active).length;
      setApiKeysCount(activeCount);
    } catch (error) {
      console.error('Error loading API keys status:', error);
    }
  };

  const handleUtmifyClick = async () => {
    setLoadingUtmify(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [tokenResult, enabledResult, summaryResult] = await Promise.all([
        supabase.from('admin_settings').select('value').eq('key', 'utmify_api_token').eq('user_id', user.id).maybeSingle(),
        supabase.from('admin_settings').select('value').eq('key', 'utmify_enabled').eq('user_id', user.id).maybeSingle(),
        supabase.rpc('get_utmify_summary')
      ]);

      const isConfigured = !!tokenResult.data?.value;
      
      setUtmifyInitialData({
        enabled: enabledResult.data?.value === 'true',
        apiToken: tokenResult.data?.value || '',
        isConfigured,
        summary: isConfigured ? (summaryResult.data as unknown as UtmifyInitialData['summary']) : null
      });

      setUtmifyDialogOpen(true);
    } catch (error) {
      console.error('Error loading Utmify data:', error);
    } finally {
      setLoadingUtmify(false);
    }
  };

  const handleApiKeysClick = () => {
    setLoadingApiKeys(true);
    setApiDialogOpen(true);
    setLoadingApiKeys(false);
  };

  const handleUtmifyDialogClose = () => {
    setUtmifyDialogOpen(false);
    setUtmifyInitialData(null);
    loadUtmifyStatus();
  };

  const handleApiDialogClose = () => {
    setApiDialogOpen(false);
    loadApiKeysStatus();
  };

  // Permission check - AFTER all hooks
  if (!permissionsLoading && !isOwner && !hasPermission('can_manage_integrations')) {
    return <AccessDenied message="Você não tem permissão para gerenciar Integrações." />;
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <Puzzle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Integrações</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Conecte serviços externos para expandir funcionalidades</p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Utmify Card - Modern Square */}
        <Card 
          className="relative overflow-hidden cursor-pointer shadow-xl border-0 bg-gradient-to-br from-card via-card to-muted/30"
          onClick={() => !loadingUtmify && handleUtmifyClick()}
        >
          {/* Status indicator */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            {loadingUtmifyStatus ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-muted border border-border animate-pulse">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-muted-foreground/40" />
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">...</span>
              </div>
            ) : utmifyConfigured && utmifyEnabled ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-medium text-green-600">Ativo</span>
              </div>
            ) : utmifyConfigured ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500" />
                <span className="text-[10px] sm:text-xs font-medium text-yellow-600">Pausado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-muted border border-border">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-muted-foreground/40" />
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Pendente</span>
              </div>
            )}
          </div>

          <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center min-h-[180px] sm:min-h-[220px]">
            {/* Logo container */}
            <div className="relative mt-2 sm:mt-4 mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-lg" />
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center">
                <img 
                  src={utmifyLogo} 
                  alt="Utmify" 
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-contain drop-shadow-lg" 
                />
              </div>
            </div>
            
            {/* Content */}
            <h3 className="font-bold text-lg sm:text-xl mb-1.5 sm:mb-2 text-primary">Utmify</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4">
              Rastreamento avançado de UTM e atribuição de conversões
            </p>
            
            {/* Action button */}
            <Button 
              variant="outline" 
              size="sm"
              className="mt-auto"
              disabled={loadingUtmify}
              onClick={(e) => {
                e.stopPropagation();
                handleUtmifyClick();
              }}
            >
              {loadingUtmify ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              Configurar
            </Button>
          </CardContent>
          
          {/* Decorative gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        </Card>

        {/* API de Pagamentos Card */}
        <Card 
          className="relative overflow-hidden cursor-pointer shadow-xl border-0 bg-gradient-to-br from-card via-card to-muted/30"
          onClick={() => !loadingApiKeys && handleApiKeysClick()}
        >
          {/* Status indicator */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            {apiKeysCount > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-medium text-green-600">Ativo</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-muted border border-border">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-muted-foreground/40" />
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Pendente</span>
              </div>
            )}
          </div>

          <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center min-h-[180px] sm:min-h-[220px]">
            {/* Logo container */}
            <div className="relative mt-2 sm:mt-4 mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-lg" />
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center">
                <img 
                  src={apiLogo} 
                  alt="API de Pagamentos" 
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-contain drop-shadow-lg" 
                />
              </div>
            </div>
            
            {/* Content */}
            <h3 className="font-bold text-lg sm:text-xl mb-1.5 sm:mb-2 text-primary">API de Pagamentos</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4">
              Integre pagamentos PIX via API em qualquer aplicação
            </p>
            
            {/* Action button */}
            <Button 
              variant="outline" 
              size="sm"
              className="mt-auto"
              disabled={loadingApiKeys}
              onClick={(e) => {
                e.stopPropagation();
                handleApiKeysClick();
              }}
            >
              {loadingApiKeys ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              Configurar
            </Button>
          </CardContent>
          
          {/* Decorative gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        </Card>
      </div>

      {/* Utmify Configuration Dialog */}
      <Dialog open={utmifyDialogOpen} onOpenChange={handleUtmifyDialogClose}>
        <DialogContent 
          className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 !animate-none !duration-0 data-[state=open]:!animate-none data-[state=closed]:!animate-none" 
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Configuração Utmify</DialogTitle>
          <div className="p-3 sm:p-4">
            {utmifyInitialData && <UtmifySection initialData={utmifyInitialData} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* API Keys Configuration Dialog */}
      <Dialog open={apiDialogOpen} onOpenChange={handleApiDialogClose}>
        <DialogContent 
          className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 !animate-none !duration-0 data-[state=open]:!animate-none data-[state=closed]:!animate-none" 
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">API de Pagamentos</DialogTitle>
          <div className="p-3 sm:p-4">
            <ApiKeysSection />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminIntegrations;
