import { useState } from "react";
import { Puzzle, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <div className="space-y-3">
        {/* Utmify Card - Horizontal Layout */}
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Logo à esquerda */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0 p-2 border">
                <img src={utmifyLogo} alt="Utmify" className="w-full h-full object-contain" />
              </div>
              
              {/* Informações no centro */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">Utmify</h3>
                <p className="text-sm text-muted-foreground truncate">
                  Rastreamento avançado de UTM e atribuição de conversões
                </p>
              </div>
              
              {/* Status e botão à direita */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {utmifyConfigured && utmifyEnabled ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 border">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                ) : utmifyConfigured ? (
                  <Badge variant="secondary">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Desativado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Não configurado
                  </Badge>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setUtmifyDialogOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utmify Configuration Dialog */}
      <Dialog open={utmifyDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Configuração Utmify</DialogTitle>
          </DialogHeader>
          <UtmifySection />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminIntegrations;
