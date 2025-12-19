import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Loader2, Check, Power, CreditCard, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const GatewayConfigSection = () => {
  const { user } = useAdminAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Gateway states
  const [ativusApiKey, setAtivusApiKey] = useState('');
  const [ativusFeeRate, setAtivusFeeRate] = useState('');
  const [ativusFixedFee, setAtivusFixedFee] = useState('');

  const [spedpayApiKey, setSpedpayApiKey] = useState('');
  const [spedpayFeeRate, setSpedpayFeeRate] = useState('');
  const [spedpayFixedFee, setSpedpayFixedFee] = useState('');

  const [valorionApiKey, setValorionApiKey] = useState('');
  const [valorionApiUrl, setValorionApiUrl] = useState('');
  const [valorionFeeRate, setValorionFeeRate] = useState('');
  const [valorionFixedFee, setValorionFixedFee] = useState('');

  const [interFeeRate, setInterFeeRate] = useState('');
  const [interFixedFee, setInterFixedFee] = useState('');
  const [interConfig, setInterConfig] = useState({
    clientId: '', clientSecret: '', certificate: '', privateKey: '', pixKey: ''
  });

  // Dialog states
  const [showAtivusDialog, setShowAtivusDialog] = useState(false);
  const [showSpedpayDialog, setShowSpedpayDialog] = useState(false);
  const [showValorionDialog, setShowValorionDialog] = useState(false);
  const [showInterDialog, setShowInterDialog] = useState(false);
  const [isLoadingInter, setIsLoadingInter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        
        setAtivusApiKey(settings.find(s => s.key === 'ativus_api_key')?.value || '');
        setAtivusFeeRate(settings.find(s => s.key === 'ativus_fee_rate')?.value || '');
        setAtivusFixedFee(settings.find(s => s.key === 'ativus_fixed_fee')?.value || '');

        setSpedpayApiKey(settings.find(s => s.key === 'spedpay_api_key')?.value || '');
        setSpedpayFeeRate(settings.find(s => s.key === 'spedpay_fee_rate')?.value || '');
        setSpedpayFixedFee(settings.find(s => s.key === 'spedpay_fixed_fee')?.value || '');

        setValorionApiKey(settings.find(s => s.key === 'valorion_api_key')?.value || '');
        setValorionApiUrl(settings.find(s => s.key === 'valorion_api_url')?.value || '');
        setValorionFeeRate(settings.find(s => s.key === 'valorion_fee_rate')?.value || '');
        setValorionFixedFee(settings.find(s => s.key === 'valorion_fixed_fee')?.value || '');

        setInterFeeRate(settings.find(s => s.key === 'inter_fee_rate')?.value || '');
        setInterFixedFee(settings.find(s => s.key === 'inter_fixed_fee')?.value || '');
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
    } finally {
      setIsLoadingInter(false);
    }
  };

  const saveFeeSettings = async (gateway: string, feeRate: string, fixedFee: string) => {
    try {
      const updates = [
        { key: `${gateway}_fee_rate`, value: feeRate },
        { key: `${gateway}_fixed_fee`, value: fixedFee }
      ];
      
      for (const { key, value } of updates) {
        const { error } = await supabase.rpc('update_admin_setting_auth', {
          setting_key: key,
          setting_value: value
        });
        if (error) throw error;
      }
      
      toast({ title: "Taxas Atualizadas", description: "Taxas salvas com sucesso." });
    } catch (error) {
      console.error('Error saving fees:', error);
      toast({ title: "Erro", description: "Falha ao salvar taxas", variant: "destructive" });
    }
  };

  const saveApiKey = async (gateway: string, apiKey: string, extraFields?: Record<string, string>) => {
    setIsSaving(true);
    try {
      const updates = [{ key: `${gateway}_api_key`, value: apiKey }];
      
      if (extraFields) {
        Object.entries(extraFields).forEach(([key, value]) => {
          updates.push({ key: `${gateway}_${key}`, value });
        });
      }
      
      for (const { key, value } of updates) {
        const { error } = await supabase.rpc('update_admin_setting_auth', {
          setting_key: key,
          setting_value: value
        });
        if (error) throw error;
      }
      
      toast({ title: "Sucesso", description: "Configurações atualizadas!" });
      loadConfigs();
    } catch (error) {
      console.error('Error saving API key:', error);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Configurações de Gateways
                <Badge variant="secondary" className="text-xs">4</Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Configure as credenciais e taxas de cada gateway de pagamento.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            
            {/* ATIVUS HUB Card */}
            <Card className="border-primary/30">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-primary">ATIVUS HUB</CardTitle>
                  <Badge variant="outline" className={ativusApiKey ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-xs" : "text-muted-foreground text-xs"}>
                    {ativusApiKey ? <><Check className="w-3 h-3 mr-1" />Configurado</> : <><Power className="w-3 h-3 mr-1" />Não configurado</>}
                  </Badge>
                </div>
                <CardDescription className="text-xs">Gateway PIX via Ativus Hub</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Taxas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa (%)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={ativusFeeRate} onChange={e => setAtivusFeeRate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Fixo (R$)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={ativusFixedFee} onChange={e => setAtivusFixedFee(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => saveFeeSettings('ativus', ativusFeeRate, ativusFixedFee)} className="w-full h-7 text-xs">
                    Salvar Taxas
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setShowAtivusDialog(true)} className="flex-1 h-7 text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Configurar API
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => testConnection('ativus')} disabled={isTesting === 'ativus' || !ativusApiKey} className="h-7 text-xs">
                    {isTesting === 'ativus' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3 mr-1" />Testar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SPEDPAY Card */}
            <Card className="border-primary/30">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-primary">SPEDPAY</CardTitle>
                  <Badge variant="outline" className={spedpayApiKey ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-xs" : "text-muted-foreground text-xs"}>
                    {spedpayApiKey ? <><Check className="w-3 h-3 mr-1" />Configurado</> : <><Power className="w-3 h-3 mr-1" />Não configurado</>}
                  </Badge>
                </div>
                <CardDescription className="text-xs">Adquirente integrada ao sistema</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Taxas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa (%)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={spedpayFeeRate} onChange={e => setSpedpayFeeRate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Fixo (R$)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={spedpayFixedFee} onChange={e => setSpedpayFixedFee(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => saveFeeSettings('spedpay', spedpayFeeRate, spedpayFixedFee)} className="w-full h-7 text-xs">
                    Salvar Taxas
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setShowSpedpayDialog(true)} className="flex-1 h-7 text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Configurar API
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => testConnection('spedpay')} disabled={isTesting === 'spedpay' || !spedpayApiKey} className="h-7 text-xs">
                    {isTesting === 'spedpay' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3 mr-1" />Testar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* VALORION Card */}
            <Card className="border-primary/30">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-primary">VALORION</CardTitle>
                  <Badge variant="outline" className={valorionApiKey ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-xs" : "text-muted-foreground text-xs"}>
                    {valorionApiKey ? <><Check className="w-3 h-3 mr-1" />Configurado</> : <><Power className="w-3 h-3 mr-1" />Não configurado</>}
                  </Badge>
                </div>
                <CardDescription className="text-xs">Gateway PIX via Valorion</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Taxas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa (%)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={valorionFeeRate} onChange={e => setValorionFeeRate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Fixo (R$)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={valorionFixedFee} onChange={e => setValorionFixedFee(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => saveFeeSettings('valorion', valorionFeeRate, valorionFixedFee)} className="w-full h-7 text-xs">
                    Salvar Taxas
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setShowValorionDialog(true)} className="flex-1 h-7 text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Configurar API
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => testConnection('valorion')} disabled={isTesting === 'valorion' || !valorionApiKey} className="h-7 text-xs">
                    {isTesting === 'valorion' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3 mr-1" />Testar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* BANCO INTER Card */}
            <Card className="border-primary/30">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-primary">BANCO INTER</CardTitle>
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    <Power className="w-3 h-3 mr-1" />Verificar
                  </Badge>
                </div>
                <CardDescription className="text-xs">Gateway PIX via Banco Inter</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Taxas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa (%)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={interFeeRate} onChange={e => setInterFeeRate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Fixo (R$)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={interFixedFee} onChange={e => setInterFixedFee(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => saveFeeSettings('inter', interFeeRate, interFixedFee)} className="w-full h-7 text-xs">
                    Salvar Taxas
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => { loadInterCredentials(); setShowInterDialog(true); }} className="flex-1 h-7 text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Configurar Credenciais
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => testConnection('inter')} disabled={isTesting === 'inter'} className="h-7 text-xs">
                    {isTesting === 'inter' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3 mr-1" />Testar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Ativus Dialog */}
      <AlertDialog open={showAtivusDialog} onOpenChange={setShowAtivusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Configurar Ativus Hub</AlertDialogTitle>
            <AlertDialogDescription>Configure sua chave API do Ativus Hub.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chave API</Label>
              <Input type="password" placeholder="Digite sua chave API" value={ativusApiKey} onChange={e => setAtivusApiKey(e.target.value)} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { saveApiKey('ativus', ativusApiKey); setShowAtivusDialog(false); }} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SpedPay Dialog */}
      <AlertDialog open={showSpedpayDialog} onOpenChange={setShowSpedpayDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Configurar SpedPay</AlertDialogTitle>
            <AlertDialogDescription>Configure a chave API global do SpedPay.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chave API</Label>
              <Input type="password" placeholder="Digite a chave API do SpedPay" value={spedpayApiKey} onChange={e => setSpedpayApiKey(e.target.value)} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { saveApiKey('spedpay', spedpayApiKey); setShowSpedpayDialog(false); }} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Valorion Dialog */}
      <AlertDialog open={showValorionDialog} onOpenChange={setShowValorionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Configurar Valorion</AlertDialogTitle>
            <AlertDialogDescription>Configure sua chave API e endpoint da Valorion.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chave API (x-api-key)</Label>
              <Input type="password" placeholder="Digite sua chave API" value={valorionApiKey} onChange={e => setValorionApiKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Endpoint URL (opcional)</Label>
              <Input type="url" placeholder="https://..." value={valorionApiUrl} onChange={e => setValorionApiUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">URL do endpoint de criação PIX</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { saveApiKey('valorion', valorionApiKey, { api_url: valorionApiUrl }); setShowValorionDialog(false); }} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inter Dialog */}
      <AlertDialog open={showInterDialog} onOpenChange={setShowInterDialog}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Configurar Banco Inter</AlertDialogTitle>
            <AlertDialogDescription>Configure as credenciais do Banco Inter.</AlertDialogDescription>
          </AlertDialogHeader>
          {isLoadingInter ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input placeholder="Digite o Client ID" value={interConfig.clientId} onChange={e => setInterConfig(prev => ({ ...prev, clientId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input type="password" placeholder="Digite o Client Secret" value={interConfig.clientSecret} onChange={e => setInterConfig(prev => ({ ...prev, clientSecret: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Certificado (.crt)</Label>
                <textarea className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-background resize-none" placeholder="Cole o conteúdo do certificado" value={interConfig.certificate} onChange={e => setInterConfig(prev => ({ ...prev, certificate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Chave Privada (.key)</Label>
                <textarea className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-background resize-none" placeholder="Cole o conteúdo da chave privada" value={interConfig.privateKey} onChange={e => setInterConfig(prev => ({ ...prev, privateKey: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input placeholder="Ex: 52027770000121" value={interConfig.pixKey} onChange={e => setInterConfig(prev => ({ ...prev, pixKey: e.target.value }))} />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={saveInterCredentials} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
