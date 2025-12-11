import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Loader2, Check, Settings, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const MultiAcquirersSection = () => {
  const { user, isAdmin } = useAdminAuth();
  const [isTestingInter, setIsTestingInter] = useState(false);
  const [showInterConfigDialog, setShowInterConfigDialog] = useState(false);
  const [isLoadingInterConfig, setIsLoadingInterConfig] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [interEnabled, setInterEnabled] = useState<boolean | null>(null);
  const [spedpayEnabled, setSpedpayEnabled] = useState<boolean | null>(null);
  const [interFeeRate, setInterFeeRate] = useState('');
  const [interFixedFee, setInterFixedFee] = useState('');
  const [spedpayFeeRate, setSpedpayFeeRate] = useState('');
  const [spedpayFixedFee, setSpedpayFixedFee] = useState('');
  const [interConfig, setInterConfig] = useState({
    clientId: '',
    clientSecret: '',
    certificate: '',
    privateKey: '',
    pixKey: ''
  });

  useEffect(() => {
    loadAcquirerStates();
  }, [isAdmin]);

  useEffect(() => {
    if (showInterConfigDialog) {
      loadInterCredentials();
    }
  }, [showInterConfigDialog]);

  const loadAcquirerStates = async () => {
    setIsLoadingStates(true);
    try {
      // Use RPC function for admin users to get global settings
      const { data, error } = await supabase.rpc('get_admin_settings_auth');
      
      if (error) {
        console.error('Error from RPC:', error);
        // Fallback: try direct query
        const { data: directData, error: directError } = await supabase
          .from('admin_settings')
          .select('key, value')
          .is('user_id', null)
          .in('key', ['inter_enabled', 'spedpay_enabled']);
        
        if (directError) {
          console.error('Direct query error:', directError);
          setInterEnabled(true);
          setSpedpayEnabled(true);
          return;
        }
        
        if (directData) {
          const interState = directData.find(s => s.key === 'inter_enabled');
          const spedpayState = directData.find(s => s.key === 'spedpay_enabled');
          setInterEnabled(interState?.value !== 'false');
          setSpedpayEnabled(spedpayState?.value !== 'false');
        }
        return;
      }
      
      console.log('Loaded acquirer states from RPC:', data);
      
      if (data) {
        const settings = data as { key: string; value: string }[];
        const interState = settings.find(s => s.key === 'inter_enabled');
        const spedpayState = settings.find(s => s.key === 'spedpay_enabled');
        const interFee = settings.find(s => s.key === 'inter_fee_rate');
        const interFixed = settings.find(s => s.key === 'inter_fixed_fee');
        const spedpayFee = settings.find(s => s.key === 'spedpay_fee_rate');
        const spedpayFixed = settings.find(s => s.key === 'spedpay_fixed_fee');
        
        // Default to true if not set, false only if explicitly set to 'false'
        setInterEnabled(interState?.value !== 'false');
        setSpedpayEnabled(spedpayState?.value !== 'false');
        setInterFeeRate(interFee?.value || '');
        setInterFixedFee(interFixed?.value || '');
        setSpedpayFeeRate(spedpayFee?.value || '');
        setSpedpayFixedFee(spedpayFixed?.value || '');
      } else {
        // No data, default to enabled
        setInterEnabled(true);
        setSpedpayEnabled(true);
      }
    } catch (error) {
      console.error('Error loading acquirer states:', error);
      setInterEnabled(true);
      setSpedpayEnabled(true);
    } finally {
      setIsLoadingStates(false);
    }
  };

  const toggleAcquirer = async (acquirer: 'inter' | 'spedpay', enabled: boolean) => {
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: `${acquirer}_enabled`,
        setting_value: enabled ? 'true' : 'false'
      });
      
      if (error) throw error;
      
      if (acquirer === 'inter') {
        setInterEnabled(enabled);
      } else {
        setSpedpayEnabled(enabled);
      }
      
      toast({
        title: enabled ? "Adquirente Ativada" : "Adquirente Desativada",
        description: `${acquirer === 'inter' ? 'Banco Inter' : 'SpedPay'} foi ${enabled ? 'ativada' : 'desativada'} com sucesso.`
      });
    } catch (error) {
      console.error('Error toggling acquirer:', error);
      toast({
        title: "Erro",
        description: "Falha ao alterar estado da adquirente",
        variant: "destructive"
      });
    }
  };

  const saveFeeSettings = async (acquirer: 'inter' | 'spedpay', feeRate: string, fixedFee: string) => {
    try {
      const updates = [
        { key: `${acquirer}_fee_rate`, value: feeRate },
        { key: `${acquirer}_fixed_fee`, value: fixedFee }
      ];
      
      for (const { key, value } of updates) {
        const { error } = await supabase.rpc('update_admin_setting_auth', {
          setting_key: key,
          setting_value: value
        });
        if (error) throw error;
      }
      
      toast({
        title: "Taxas Atualizadas",
        description: `Taxas do ${acquirer === 'inter' ? 'Banco Inter' : 'SpedPay'} salvas com sucesso.`
      });
    } catch (error) {
      console.error('Error saving fees:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar taxas",
        variant: "destructive"
      });
    }
  };

  const loadInterCredentials = async () => {
    setIsLoadingInterConfig(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-inter-credentials');
      
      if (error) throw error;
      
      if (data?.success && data?.credentials) {
        setInterConfig({
          clientId: data.credentials.clientId || '',
          clientSecret: data.credentials.clientSecret || '',
          certificate: data.credentials.certificate || '',
          privateKey: data.credentials.privateKey || '',
          pixKey: data.credentials.pixKey || ''
        });
      }
    } catch (error) {
      console.error('Error loading Inter credentials:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar credenciais",
        variant: "destructive"
      });
    } finally {
      setIsLoadingInterConfig(false);
    }
  };

  const saveInterCredentials = async () => {
    try {
      const updates = [
        { key: 'inter_client_id', value: interConfig.clientId },
        { key: 'inter_client_secret', value: interConfig.clientSecret },
        { key: 'inter_certificate', value: interConfig.certificate },
        { key: 'inter_private_key', value: interConfig.privateKey },
        { key: 'inter_pix_key', value: interConfig.pixKey }
      ];
      
      for (const { key, value } of updates) {
        const { error } = await supabase.rpc('update_admin_setting_auth', {
          setting_key: key,
          setting_value: value
        });
        if (error) throw error;
      }
      
      toast({
        title: "Sucesso",
        description: "Credenciais do Banco Inter atualizadas!"
      });
      setShowInterConfigDialog(false);
    } catch (error) {
      console.error('Error saving Inter credentials:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar credenciais",
        variant: "destructive"
      });
    }
  };

  const testInterConnection = async () => {
    setIsTestingInter(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pix-inter', {
        body: {
          amount: 0.01,
          donorName: 'Teste Conexão',
          productName: 'Teste Inter',
          userId: user?.id
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Conexão OK",
          description: "Banco Inter está funcionando corretamente!"
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro ao testar Inter:', error);
      toast({
        title: "Erro na conexão",
        description: error.message || "Falha ao conectar com Banco Inter",
        variant: "destructive"
      });
    } finally {
      setIsTestingInter(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Adquirentes Ativas</h2>
          <Badge variant="secondary" className="text-xs">2</Badge>
        </div>
        <Button variant="outline" disabled>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Adquirente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* BANCO INTER Card */}
        <Card className={`border-primary/50 transition-opacity ${interEnabled === false ? 'opacity-60' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-primary">BANCO INTER</CardTitle>
                <CardDescription className="text-sm">
                  Gateway PIX via Banco Inter
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingStates ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={interEnabled ?? true}
                    onCheckedChange={(checked) => toggleAcquirer('inter', checked)}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Métodos de pagamento disponíveis:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                        <path d="M21.8 9.6l-4.4 4.4c-.8.8-2 .8-2.8 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.8-.8 2-.8 2.8 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                        <path d="M21.8 23.8l-4.4-4.4c-.8-.8-2-.8-2.8 0l-4.4 4.4c-.4.4-.4 1 0 1.4l4.4 4.4c.8.8 2 .8 2.8 0l4.4-4.4c.4-.4.4-1 0-1.4z" fill="#10b981"/>
                        <path d="M9.6 21.8l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-4.4 4.4c-.4.4-1 .4-1.4 0z" fill="#10b981"/>
                        <path d="M28.2 17.4l-4.4 4.4c-.4.4-1 .4-1.4 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium">PIX</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{interEnabled !== false ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>
            </div>
            
            {/* Fee Configuration */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">Taxas:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={interFeeRate}
                    onChange={(e) => setInterFeeRate(e.target.value)}
                    className="h-8 text-sm"
                    disabled={interEnabled === false}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={interFixedFee}
                    onChange={(e) => setInterFixedFee(e.target.value)}
                    className="h-8 text-sm"
                    disabled={interEnabled === false}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveFeeSettings('inter', interFeeRate, interFixedFee)}
                className="w-full h-7 text-xs"
                disabled={interEnabled === false}
              >
                Salvar Taxas
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <Badge 
                variant="outline" 
                className={interEnabled !== false
                  ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-xs"
                  : "text-muted-foreground border-muted-foreground/30 bg-muted text-xs"
                }
              >
                {interEnabled !== false ? <Check className="w-3 h-3 mr-1" /> : <Power className="w-3 h-3 mr-1" />}
                {interEnabled !== false ? 'Integrado' : 'Desativado'}
              </Badge>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowInterConfigDialog(true)}
                  className="h-7 text-xs px-2"
                  disabled={interEnabled === false}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Config
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testInterConnection}
                  disabled={isTestingInter || interEnabled === false}
                  className="h-7 text-xs px-2"
                >
                  {isTestingInter ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Testar"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Configuração do Banco Inter */}
        <AlertDialog open={showInterConfigDialog} onOpenChange={setShowInterConfigDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurar Banco Inter
              </AlertDialogTitle>
              <AlertDialogDescription>
                Atualize as credenciais do Banco Inter para usar outra conta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inter-client-id">Client ID</Label>
                <Input
                  id="inter-client-id"
                  placeholder="Digite o Client ID"
                  value={interConfig.clientId}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, clientId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inter-client-secret">Client Secret</Label>
                <Input
                  id="inter-client-secret"
                  type="password"
                  placeholder="Digite o Client Secret"
                  value={interConfig.clientSecret}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inter-certificate">Certificado (.crt)</Label>
                <textarea
                  id="inter-certificate"
                  className="w-full h-24 px-3 py-2 text-sm border rounded-md bg-background resize-none"
                  placeholder="Cole o conteúdo do certificado"
                  value={interConfig.certificate}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, certificate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inter-private-key">Chave Privada (.key)</Label>
                <textarea
                  id="inter-private-key"
                  className="w-full h-24 px-3 py-2 text-sm border rounded-md bg-background resize-none"
                  placeholder="Cole o conteúdo da chave privada"
                  value={interConfig.privateKey}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, privateKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inter-pix-key">Chave PIX (CNPJ/CPF/Email/Telefone)</Label>
                <Input
                  id="inter-pix-key"
                  placeholder="Ex: 52027770000121"
                  value={interConfig.pixKey}
                  onChange={(e) => setInterConfig(prev => ({ ...prev, pixKey: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Para CNPJ/CPF, digite apenas números (sem pontos, traços ou barras)
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={saveInterCredentials}>
                Salvar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* SPEDPAY Card */}
        <Card className={`border-primary/50 transition-opacity ${spedpayEnabled === false ? 'opacity-60' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-primary">SPEDPAY</CardTitle>
                <CardDescription className="text-sm">
                  Adquirente principal integrada ao sistema
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingStates ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={spedpayEnabled ?? true}
                    onCheckedChange={(checked) => toggleAcquirer('spedpay', checked)}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Métodos de pagamento disponíveis:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                        <path d="M21.8 9.6l-4.4 4.4c-.8.8-2 .8-2.8 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.8-.8 2-.8 2.8 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                        <path d="M21.8 23.8l-4.4-4.4c-.8-.8-2-.8-2.8 0l-4.4 4.4c-.4.4-.4 1 0 1.4l4.4 4.4c.8.8 2 .8 2.8 0l4.4-4.4c.4-.4.4-1 0-1.4z" fill="#10b981"/>
                        <path d="M9.6 21.8l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-4.4 4.4c-.4.4-1 .4-1.4 0z" fill="#10b981"/>
                        <path d="M28.2 17.4l-4.4 4.4c-.4.4-1 .4-1.4 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium">PIX</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{spedpayEnabled !== false ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>
            </div>
            
            {/* Fee Configuration */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">Taxas:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={spedpayFeeRate}
                    onChange={(e) => setSpedpayFeeRate(e.target.value)}
                    className="h-8 text-sm"
                    disabled={spedpayEnabled === false}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={spedpayFixedFee}
                    onChange={(e) => setSpedpayFixedFee(e.target.value)}
                    className="h-8 text-sm"
                    disabled={spedpayEnabled === false}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveFeeSettings('spedpay', spedpayFeeRate, spedpayFixedFee)}
                className="w-full h-7 text-xs"
                disabled={spedpayEnabled === false}
              >
                Salvar Taxas
              </Button>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <Badge 
                variant="outline" 
                className={spedpayEnabled !== false
                  ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10"
                  : "text-muted-foreground border-muted-foreground/30 bg-muted"
                }
              >
                {spedpayEnabled !== false ? <Check className="w-3 h-3 mr-1" /> : <Power className="w-3 h-3 mr-1" />}
                {spedpayEnabled !== false ? 'Integrado' : 'Desativado'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Add New Acquirer Card (Placeholder) */}
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-not-allowed opacity-50">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Adicionar Nova Adquirente</p>
            <p className="text-xs text-muted-foreground mt-1">Em breve</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Novas adquirentes serão disponibilizadas em futuras atualizações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
