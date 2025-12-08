import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Puzzle, Check, Plus, ExternalLink, Settings, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "available" | "coming_soon";
  icon?: string;
  methods?: string[];
  configurable?: boolean;
}

const integrations: Integration[] = [
  {
    id: "spedpay",
    name: "SpedPay",
    description: "Gateway de pagamento PIX integrado",
    status: "connected",
    methods: ["PIX"],
    configurable: true
  },
  {
    id: "asaas",
    name: "Asaas",
    description: "Plataforma completa de cobranças",
    status: "coming_soon",
    methods: ["PIX", "Cartão", "Boleto"]
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    description: "Soluções de pagamento digital",
    status: "coming_soon",
    methods: ["PIX", "Cartão"]
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Pagamentos internacionais",
    status: "coming_soon",
    methods: ["Cartão"]
  }
];

const AdminIntegrations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticated, loading, navigate]);

  const loadIntegrationConfig = async (integrationId: string) => {
    setIsLoadingConfig(true);
    try {
      const { data, error } = await supabase.rpc('get_user_settings');
      if (error) throw error;
      
      const apiKeySetting = data?.find((s: { key: string; value: string }) => s.key === `${integrationId}_api_key`);
      if (apiKeySetting) {
        setApiKey(apiKeySetting.value);
      } else {
        setApiKey("");
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      setApiKey("");
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleOpenConfig = async (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowApiKey(false);
    setConfigDialogOpen(true);
    await loadIntegrationConfig(integration.id);
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('update_user_setting', {
        setting_key: `${selectedIntegration.id}_api_key`,
        setting_value: apiKey
      });
      
      if (error) throw error;
      
      toast.success("Credenciais salvas com sucesso!");
      setConfigDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro ao salvar credenciais");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Puzzle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Integrações</h1>
            <p className="text-sm text-muted-foreground">Conecte gateways de pagamento e serviços externos</p>
          </div>
        </div>

        {/* Active Integrations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Integrações Ativas</h2>
            <Badge variant="secondary">1</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.filter(i => i.status === "connected").map((integration) => (
              <Card key={integration.id} className="border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-primary">
                      {integration.name.toUpperCase()}
                    </CardTitle>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-600/10">
                      <Check className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Métodos disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {integration.methods?.map((method) => (
                        <Badge key={method} variant="secondary" className="text-xs">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {integration.configurable && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleOpenConfig(integration)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Available Integrations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Disponível em Breve</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.filter(i => i.status === "coming_soon").map((integration) => (
              <Card key={integration.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-muted-foreground">
                      {integration.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-muted-foreground">
                      Em breve
                    </Badge>
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Métodos disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {integration.methods?.map((method) => (
                        <Badge key={method} variant="outline" className="text-xs text-muted-foreground">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    <Plus className="w-4 h-4 mr-2" />
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Novas integrações serão disponibilizadas em futuras atualizações. 
              Entre em contato com o suporte para solicitar integrações específicas.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Insira suas credenciais de API para configurar a integração.
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Chave de API</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    placeholder="Insira sua chave de API"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sua chave de API será armazenada de forma segura.
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveConfig} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminIntegrations;
