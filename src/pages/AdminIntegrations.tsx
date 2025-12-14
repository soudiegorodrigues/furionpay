import { useState } from "react";
import { Puzzle, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UtmifySection } from "@/components/admin/UtmifySection";
import utmifyLogo from "@/assets/utmify-logo.png";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminIntegrations = () => {
  const [utmifyDialogOpen, setUtmifyDialogOpen] = useState(false);
  const [utmifyConfigured, setUtmifyConfigured] = useState(false);
  const [utmifyEnabled, setUtmifyEnabled] = useState(false);

  useEffect(() => {
    loadUtmifyStatus();
  }, []);

  const loadUtmifyStatus = async () => {
    try {
      const { data: tokenData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'utmify_api_token')
        .is('user_id', null)
        .maybeSingle();

      const { data: enabledData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'utmify_enabled')
        .is('user_id', null)
        .maybeSingle();

      setUtmifyConfigured(!!tokenData?.value);
      setUtmifyEnabled(enabledData?.value === 'true');
    } catch (error) {
      console.error('Error loading Utmify status:', error);
    }
  };

  const handleDialogClose = () => {
    setUtmifyDialogOpen(false);
    loadUtmifyStatus();
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Puzzle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-sm text-muted-foreground">Conecte serviços externos para expandir funcionalidades</p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Utmify Card - Modern Square */}
        <Card 
          className="relative overflow-hidden cursor-pointer shadow-xl border-0 bg-gradient-to-br from-card via-card to-muted/30"
          onClick={() => setUtmifyDialogOpen(true)}
        >
          {/* Status indicator */}
          <div className="absolute top-4 right-4 z-10">
            {utmifyConfigured && utmifyEnabled ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-600">Ativo</span>
              </div>
            ) : utmifyConfigured ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs font-medium text-yellow-600">Pausado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <span className="text-xs font-medium text-muted-foreground">Pendente</span>
              </div>
            )}
          </div>

          <CardContent className="p-6 flex flex-col items-center text-center min-h-[220px]">
            {/* Logo container - no background, larger size */}
            <div className="relative mt-4 mb-6">
              <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-lg" />
              <div className="relative w-20 h-20 flex items-center justify-center">
                <img src={utmifyLogo} alt="Utmify" className="w-full h-full object-contain drop-shadow-lg" />
              </div>
            </div>
            
            {/* Content */}
            <h3 className="font-bold text-xl mb-2 text-primary">Utmify</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Rastreamento avançado de UTM e atribuição de conversões
            </p>
            
            {/* Action button - always visible */}
            <Button 
              variant="outline" 
              size="sm"
              className="mt-auto"
              onClick={(e) => {
                e.stopPropagation();
                setUtmifyDialogOpen(true);
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
          </CardContent>
          
          {/* Decorative gradient line - always visible */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        </Card>
      </div>

      {/* Utmify Configuration Dialog */}
      <Dialog open={utmifyDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Configuração Utmify</DialogTitle>
          <div className="p-4">
            <UtmifySection />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminIntegrations;
