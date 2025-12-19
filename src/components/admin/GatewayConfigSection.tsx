import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Loader2, Check, AlertCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface GatewayConfig {
  apiKey: string;
  apiUrl?: string;
  feeRate: string;
  fixedFee: string;
  isConfigured: boolean;
}

export const GatewayConfigSection = () => {
  const { user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("ativus");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Gateway configs
  const [ativusConfig, setAtivusConfig] = useState<GatewayConfig>({
    apiKey: '', feeRate: '', fixedFee: '', isConfigured: false
  });
  const [spedpayConfig, setSpedpayConfig] = useState<GatewayConfig>({
    apiKey: '', feeRate: '', fixedFee: '', isConfigured: false
  });
  const [valorionConfig, setValorionConfig] = useState<GatewayConfig>({
    apiKey: '', apiUrl: '', feeRate: '', fixedFee: '', isConfigured: false
  });
  const [interConfig, setInterConfig] = useState({
    clientId: '', clientSecret: '', certificate: '', privateKey: '', pixKey: '',
    feeRate: '', fixedFee: '', isConfigured: false
  });

  // Inter config dialog
  const [showInterDialog, setShowInterDialog] = useState(false);
  const [isLoadingInter, setIsLoadingInter] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_settings_auth');
      if (error) throw error;

      if (data) {
        const settings = data as { key: string; value: string }[];
        
        // Ativus
        setAtivusConfig({
          apiKey: settings.find(s => s.key === 'ativus_api_key')?.value || '',
          feeRate: settings.find(s => s.key === 'ativus_fee_rate')?.value || '',
          fixedFee: settings.find(s => s.key === 'ativus_fixed_fee')?.value || '',
          isConfigured: !!settings.find(s => s.key === 'ativus_api_key')?.value
        });

        // SpedPay
        setSpedpayConfig({
          apiKey: settings.find(s => s.key === 'spedpay_api_key')?.value || '',
          feeRate: settings.find(s => s.key === 'spedpay_fee_rate')?.value || '',
          fixedFee: settings.find(s => s.key === 'spedpay_fixed_fee')?.value || '',
          isConfigured: !!settings.find(s => s.key === 'spedpay_api_key')?.value
        });

        // Valorion
        setValorionConfig({
          apiKey: settings.find(s => s.key === 'valorion_api_key')?.value || '',
          apiUrl: settings.find(s => s.key === 'valorion_api_url')?.value || '',
          feeRate: settings.find(s => s.key === 'valorion_fee_rate')?.value || '',
          fixedFee: settings.find(s => s.key === 'valorion_fixed_fee')?.value || '',
          isConfigured: !!settings.find(s => s.key === 'valorion_api_key')?.value
        });

        // Inter
        setInterConfig(prev => ({
          ...prev,
          feeRate: settings.find(s => s.key === 'inter_fee_rate')?.value || '',
          fixedFee: settings.find(s => s.key === 'inter_fixed_fee')?.value || '',
        }));
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInterCredentials = async () => {
    setIsLoadingInter(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-inter-credentials');
      if (error) throw error;
      if (data?.success && data?.credentials) {
        setInterConfig(prev => ({
          ...prev,
          clientId: data.credentials.clientId || '',
          clientSecret: data.credentials.clientSecret || '',
          certificate: data.credentials.certificate || '',
          privateKey: data.credentials.privateKey || '',
          pixKey: data.credentials.pixKey || '',
          isConfigured: data.credentials.isFullyConfigured || false
        }));
      }
    } catch (error) {
      console.error('Error loading Inter credentials:', error);
    } finally {
      setIsLoadingInter(false);
    }
  };

  const saveConfig = async (gateway: string, config: Record<string, string>) => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(config)) {
        const { error } = await supabase.rpc('update_admin_setting_auth', {
          setting_key: `${gateway}_${key}`,
          setting_value: value
        });
        if (error) throw error;
      }
      toast({ title: "Configurações Salvas", description: `Configurações do gateway atualizadas.` });
      loadConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({ title: "Erro", description: "Falha ao salvar configurações", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const saveInterCredentials = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { key: 'inter_client_id', value: interConfig.clientId },
        { key: 'inter_client_secret', value: interConfig.clientSecret },
        { key: 'inter_certificate', value: interConfig.certificate },
        { key: 'inter_private_key', value: interConfig.privateKey },
        { key: 'inter_pix_key', value: interConfig.pixKey },
      ];
      
      for (const { key, value } of updates) {
        const { error } = await supabase.rpc('update_admin_setting_auth', {
          setting_key: key,
          setting_value: value
        });
        if (error) throw error;
      }
      
      toast({ title: "Sucesso", description: "Credenciais do Banco Inter atualizadas!" });
      setShowInterDialog(false);
    } catch (error) {
      console.error('Error saving Inter credentials:', error);
      toast({ title: "Erro", description: "Falha ao salvar credenciais", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (gateway: string) => {
    setIsTesting(gateway);
    try {
      let functionName = '';
      switch (gateway) {
        case 'ativus': functionName = 'generate-pix-ativus'; break;
        case 'spedpay': functionName = 'generate-pix'; break;
        case 'valorion': functionName = 'generate-pix-valorion'; break;
        case 'inter': functionName = 'generate-pix-inter'; break;
        default: return;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          amount: gateway === 'inter' ? 0.01 : 0.50,
          donorName: 'Teste Conexão',
          productName: `Teste ${gateway}`,
          userId: user?.id
        }
      });

      if (error) throw error;
      if (data?.success) {
        toast({ title: "Conexão OK", description: `${gateway.toUpperCase()} está funcionando!` });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error(`Erro ao testar ${gateway}:`, error);
      toast({ 
        title: "Erro na conexão", 
        description: error.message || `Falha ao conectar com ${gateway}`,
        variant: "destructive" 
      });
    } finally {
      setIsTesting(null);
    }
  };

  const renderGatewayTab = (
    gateway: string,
    title: string,
    config: GatewayConfig,
    setConfig: React.Dispatch<React.SetStateAction<GatewayConfig>>,
    showApiUrl?: boolean
  ) => (
    <TabsContent value={gateway} className="space-y-4 mt-4">
      <div className="grid gap-4">
        {/* API Key */}
        <div className="space-y-2">
          <Label>Chave API</Label>
          <Input
            type="password"
            placeholder={`Digite a chave API do ${title}`}
            value={config.apiKey}
            onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
          />
        </div>

        {/* API URL (for Valorion) */}
        {showApiUrl && (
          <div className="space-y-2">
            <Label>Endpoint URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={config.apiUrl || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">URL do endpoint de criação PIX (opcional)</p>
          </div>
        )}

        {/* Fee Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Taxa (%)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={config.feeRate}
              onChange={(e) => setConfig(prev => ({ ...prev, feeRate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor Fixo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={config.fixedFee}
              onChange={(e) => setConfig(prev => ({ ...prev, fixedFee: e.target.value }))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={() => saveConfig(gateway, {
              api_key: config.apiKey,
              ...(config.apiUrl ? { api_url: config.apiUrl } : {}),
              fee_rate: config.feeRate,
              fixed_fee: config.fixedFee
            })}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Configurações
          </Button>
          <Button
            variant="outline"
            onClick={() => testConnection(gateway)}
            disabled={isTesting === gateway || !config.apiKey}
          >
            {isTesting === gateway ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4 mr-1" />
                Testar
              </>
            )}
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          {config.isConfigured ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-600/30">
              <Check className="w-3 h-3 mr-1" />
              Configurado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <AlertCircle className="w-3 h-3 mr-1" />
              Não configurado
            </Badge>
          )}
        </div>
      </div>
    </TabsContent>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Configurações de Gateways</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Configure as credenciais e taxas de cada gateway de pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="ativus" className="text-xs">
                Ativus Hub
                {ativusConfig.isConfigured && <Check className="w-3 h-3 ml-1 text-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger value="spedpay" className="text-xs">
                SpedPay
                {spedpayConfig.isConfigured && <Check className="w-3 h-3 ml-1 text-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger value="valorion" className="text-xs">
                Valorion
                {valorionConfig.isConfigured && <Check className="w-3 h-3 ml-1 text-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger value="inter" className="text-xs">
                Banco Inter
                {interConfig.isConfigured && <Check className="w-3 h-3 ml-1 text-emerald-500" />}
              </TabsTrigger>
            </TabsList>

            {renderGatewayTab('ativus', 'Ativus Hub', ativusConfig, setAtivusConfig)}
            {renderGatewayTab('spedpay', 'SpedPay', spedpayConfig, setSpedpayConfig)}
            {renderGatewayTab('valorion', 'Valorion', valorionConfig, setValorionConfig, true)}

            {/* Inter Tab - Special because of multiple credentials */}
            <TabsContent value="inter" className="space-y-4 mt-4">
              <div className="grid gap-4">
                {/* Fee Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Taxa (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={interConfig.feeRate}
                      onChange={(e) => setInterConfig(prev => ({ ...prev, feeRate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Fixo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={interConfig.fixedFee}
                      onChange={(e) => setInterConfig(prev => ({ ...prev, fixedFee: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={() => saveConfig('inter', {
                      fee_rate: interConfig.feeRate,
                      fixed_fee: interConfig.fixedFee
                    })}
                    disabled={isSaving}
                    variant="outline"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar Taxas
                  </Button>
                  <Button
                    onClick={() => {
                      loadInterCredentials();
                      setShowInterDialog(true);
                    }}
                    variant="outline"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Configurar Credenciais
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testConnection('inter')}
                    disabled={isTesting === 'inter'}
                  >
                    {isTesting === 'inter' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-1" />
                        Testar
                      </>
                    )}
                  </Button>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 text-sm">
                  {interConfig.isConfigured ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-600/30">
                      <Check className="w-3 h-3 mr-1" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Não configurado
                    </Badge>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Inter Credentials Dialog */}
      <AlertDialog open={showInterDialog} onOpenChange={setShowInterDialog}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurar Banco Inter
            </AlertDialogTitle>
            <AlertDialogDescription>
              Configure as credenciais do Banco Inter para integração PIX.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {isLoadingInter ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  placeholder="Digite o Client ID"
                  value={interConfig.clientId}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, clientId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  placeholder="Digite o Client Secret"
                  value={interConfig.clientSecret}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Certificado (.crt)</Label>
                <textarea
                  className="w-full h-24 px-3 py-2 text-sm border rounded-md bg-background resize-none"
                  placeholder="Cole o conteúdo do certificado"
                  value={interConfig.certificate}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, certificate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Chave Privada (.key)</Label>
                <textarea
                  className="w-full h-24 px-3 py-2 text-sm border rounded-md bg-background resize-none"
                  placeholder="Cole o conteúdo da chave privada"
                  value={interConfig.privateKey}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, privateKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input
                  placeholder="Ex: 52027770000121"
                  value={interConfig.pixKey}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, pixKey: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Para CNPJ/CPF, digite apenas números
                </p>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={saveInterCredentials} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
