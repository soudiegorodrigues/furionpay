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

      {/* Integration Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Utmify Card */}
        <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img src={utmifyLogo} alt="Utmify" className="w-full h-full object-cover" />
              </div>
              {utmifyConfigured && utmifyEnabled ? (
                <Badge variant="default" className="bg-green-500 hover:bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ativo
                </Badge>
              ) : utmifyConfigured ? (
                <Badge variant="secondary">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Desativado
                </Badge>
              ) : (
                <Badge variant="outline">
                  Não configurado
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-lg mb-1">Utmify</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Rastreamento avançado de UTM e atribuição de conversões
            </p>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setUtmifyDialogOpen(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
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
