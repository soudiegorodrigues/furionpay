import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Loader2, Check, Power, CreditCard, Zap, Eye, EyeOff, Upload, FileKey } from "lucide-react";
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

  const [valorionApiKey, setValorionApiKey] = useState('');
  const [valorionApiUrl, setValorionApiUrl] = useState('');
  const [valorionFeeRate, setValorionFeeRate] = useState('');
  const [valorionFixedFee, setValorionFixedFee] = useState('');

  const [interFeeRate, setInterFeeRate] = useState('');
  const [interFixedFee, setInterFixedFee] = useState('');
  const [interConfig, setInterConfig] = useState({
    clientId: '', clientSecret: '', certificate: '', privateKey: '', pixKey: ''
  });

  // EFI Pay states
  const [efiFeeRate, setEfiFeeRate] = useState('');
  const [efiFixedFee, setEfiFixedFee] = useState('');
  const [efiConfig, setEfiConfig] = useState({
    clientId: '', clientSecret: '', certificate: '', privateKey: '', pixKey: '', environment: 'production'
  });

  // Enabled states for each gateway
  const [ativusEnabled, setAtivusEnabled] = useState(false);
  const [valorionEnabled, setValorionEnabled] = useState(false);
  const [interEnabled, setInterEnabled] = useState(false);
  const [efiEnabled, setEfiEnabled] = useState(false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState<string | null>(null);

  // Dialog states
  const [showAtivusDialog, setShowAtivusDialog] = useState(false);
  const [showValorionDialog, setShowValorionDialog] = useState(false);
  const [showInterDialog, setShowInterDialog] = useState(false);
  const [showEfiDialog, setShowEfiDialog] = useState(false);
  const [isLoadingInter, setIsLoadingInter] = useState(false);
  
  // P12 upload states
  const [p12Password, setP12Password] = useState('');
  const [isConvertingP12, setIsConvertingP12] = useState(false);
  const p12FileInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingEfi, setIsLoadingEfi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Show/hide password states
  const [showAtivusKey, setShowAtivusKey] = useState(false);
  const [showValorionKey, setShowValorionKey] = useState(false);
  const [showInterClientId, setShowInterClientId] = useState(false);
  const [showInterSecret, setShowInterSecret] = useState(false);
  const [showInterCert, setShowInterCert] = useState(false);
  const [showInterKey, setShowInterKey] = useState(false);
  const [showInterPixKey, setShowInterPixKey] = useState(false);
  const [showEfiClientId, setShowEfiClientId] = useState(false);
  const [showEfiSecret, setShowEfiSecret] = useState(false);
  const [showEfiCert, setShowEfiCert] = useState(false);
  const [showEfiKey, setShowEfiKey] = useState(false);
  const [showEfiPixKey, setShowEfiPixKey] = useState(false);

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

        setValorionApiKey(settings.find(s => s.key === 'valorion_api_key')?.value || '');
        setValorionApiUrl(settings.find(s => s.key === 'valorion_api_url')?.value || '');
        setValorionFeeRate(settings.find(s => s.key === 'valorion_fee_rate')?.value || '');
        setValorionFixedFee(settings.find(s => s.key === 'valorion_fixed_fee')?.value || '');

        setInterFeeRate(settings.find(s => s.key === 'inter_fee_rate')?.value || '');
        setInterFixedFee(settings.find(s => s.key === 'inter_fixed_fee')?.value || '');

        setEfiFeeRate(settings.find(s => s.key === 'efi_fee_rate')?.value || '');
        setEfiFixedFee(settings.find(s => s.key === 'efi_fixed_fee')?.value || '');

        // Load enabled states
        setAtivusEnabled(settings.find(s => s.key === 'ativus_enabled')?.value === 'true');
        setValorionEnabled(settings.find(s => s.key === 'valorion_enabled')?.value === 'true');
        setInterEnabled(settings.find(s => s.key === 'inter_enabled')?.value === 'true');
        setEfiEnabled(settings.find(s => s.key === 'efi_enabled')?.value === 'true');
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGatewayEnabled = async (gateway: string, enabled: boolean) => {
    setIsTogglingEnabled(gateway);
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: `${gateway}_enabled`,
        setting_value: enabled ? 'true' : 'false'
      });
      if (error) throw error;

      // Update local state
      switch (gateway) {
        case 'ativus': setAtivusEnabled(enabled); break;
        case 'valorion': setValorionEnabled(enabled); break;
        case 'inter': setInterEnabled(enabled); break;
        case 'efi': setEfiEnabled(enabled); break;
      }

      toast({ 
        title: enabled ? "Gateway Ativado" : "Gateway Desativado", 
        description: `${gateway.toUpperCase()} foi ${enabled ? 'ativado' : 'desativado'} com sucesso.` 
      });
    } catch (error) {
      console.error('Error toggling gateway:', error);
      toast({ title: "Erro", description: "Falha ao alterar status do gateway", variant: "destructive" });
    } finally {
      setIsTogglingEnabled(null);
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

  const loadEfiCredentials = async () => {
    setIsLoadingEfi(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_settings_auth');
      if (error) throw error;
      if (data) {
        const settings = data as { key: string; value: string }[];
        setEfiConfig({
          clientId: settings.find(s => s.key === 'efi_client_id')?.value || '',
          clientSecret: settings.find(s => s.key === 'efi_client_secret')?.value || '',
          certificate: settings.find(s => s.key === 'efi_certificate')?.value || '',
          privateKey: settings.find(s => s.key === 'efi_private_key')?.value || '',
          pixKey: settings.find(s => s.key === 'efi_pix_key')?.value || '',
          environment: settings.find(s => s.key === 'efi_environment')?.value || 'production',
        });
      }
    } catch (error) {
      console.error('Error loading EFI credentials:', error);
    } finally {
      setIsLoadingEfi(false);
    }
  };

  const saveEfiCredentials = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { key: 'efi_client_id', value: efiConfig.clientId },
        { key: 'efi_client_secret', value: efiConfig.clientSecret },
        { key: 'efi_certificate', value: efiConfig.certificate },
        { key: 'efi_private_key', value: efiConfig.privateKey },
        { key: 'efi_pix_key', value: efiConfig.pixKey },
        { key: 'efi_environment', value: efiConfig.environment },
      ];
      
      for (const { key, value } of updates) {
        const { error } = await supabase.rpc('update_admin_setting_auth', {
          setting_key: key,
          setting_value: value
        });
        if (error) throw error;
      }
      
      toast({ title: "Sucesso", description: "Credenciais da EFI Pay atualizadas!" });
      setShowEfiDialog(false);
    } catch (error) {
      console.error('Error saving EFI credentials:', error);
      toast({ title: "Erro", description: "Falha ao salvar credenciais", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle P12 file upload and conversion
  const handleP12Upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.p12') && !file.name.endsWith('.pfx')) {
      toast({ 
        title: "Arquivo inválido", 
        description: "Selecione um arquivo .p12 ou .pfx", 
        variant: "destructive" 
      });
      return;
    }

    setIsConvertingP12(true);
    
    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      console.log("Arquivo P12 carregado, tentando converter...");
      
      // Call edge function to convert
      const { data, error } = await supabase.functions.invoke('convert-p12-to-pem', {
        body: { p12Base64: base64, password: p12Password }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        // Auto-fill the certificate and private key fields
        setEfiConfig(prev => ({
          ...prev,
          certificate: data.certificate,
          privateKey: data.privateKey
        }));
        
        toast({ 
          title: "Certificado convertido!", 
          description: "Certificado e chave privada preenchidos automaticamente." 
        });
      } else if (data?.manualInstructions) {
        // Show manual instructions
        toast({ 
          title: "Conversão manual necessária", 
          description: "Use uma ferramenta online para converter o certificado. Veja as instruções abaixo.",
          variant: "destructive"
        });
        
        // Show instructions in console for now
        console.log("Instruções de conversão manual:", data.manualInstructions);
        
        // Alert with instructions
        alert(`Conversão automática não disponível.\n\nOpções:\n\n1. Acesse: https://www.sslshopper.com/ssl-converter.html\n2. Faça upload do arquivo .p12\n3. Tipo de origem: PKCS#12\n4. Tipo de destino: PEM\n5. Digite a senha do certificado\n\nOu use OpenSSL:\nopenssl pkcs12 -in ${file.name} -clcerts -nokeys -out cert.pem\nopenssl pkcs12 -in ${file.name} -nocerts -nodes -out key.pem`);
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
      
    } catch (error: any) {
      console.error("Erro ao converter P12:", error);
      toast({ 
        title: "Erro na conversão", 
        description: error.message || "Falha ao converter certificado",
        variant: "destructive" 
      });
    } finally {
      setIsConvertingP12(false);
      // Reset file input
      if (p12FileInputRef.current) {
        p12FileInputRef.current.value = '';
      }
    }
  };

  // Testa conexão SEM criar transações reais - usa mesma lógica do health-check
  const testConnection = async (gateway: string) => {
    setIsTesting(gateway);
    try {
      const { data, error } = await supabase.functions.invoke('health-check-acquirers', {
        body: { 
          singleAcquirer: gateway
        }
      });

      if (error) throw error;
      
      const result = data?.results?.find((r: any) => r.acquirer === gateway);
      
      if (result?.is_healthy) {
        toast({ 
          title: "Conexão OK", 
          description: `${gateway.toUpperCase()} respondeu em ${result.response_time_ms}ms` 
        });
      } else {
        throw new Error(result?.error || 'Falha na conexão');
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* ATIVUS HUB Card */}
            <Card className={`border-primary/30 ${!ativusEnabled ? 'opacity-60' : ''}`}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Switch 
                    checked={ativusEnabled} 
                    onCheckedChange={(checked) => toggleGatewayEnabled('ativus', checked)}
                    disabled={isTogglingEnabled === 'ativus'}
                    className="h-4 w-8 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4"
                  />
                  <CardTitle className="text-sm font-bold text-primary">ATIVUS HUB</CardTitle>
                  <Badge variant="outline" className={ativusEnabled ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-xs" : "text-muted-foreground text-xs"}>
                    {ativusEnabled ? <><Check className="w-3 h-3 mr-1" />Ativo</> : <><Power className="w-3 h-3 mr-1" />Off</>}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-center">Gateway PIX via Ativus Hub</CardDescription>
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

            {/* VALORION Card */}
            <Card className={`border-primary/30 ${!valorionEnabled ? 'opacity-60' : ''}`}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Switch 
                    checked={valorionEnabled} 
                    onCheckedChange={(checked) => toggleGatewayEnabled('valorion', checked)}
                    disabled={isTogglingEnabled === 'valorion'}
                    className="h-4 w-8 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4"
                  />
                  <CardTitle className="text-sm font-bold text-primary">VALORION</CardTitle>
                  <Badge variant="outline" className={valorionEnabled ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-xs" : "text-muted-foreground text-xs"}>
                    {valorionEnabled ? <><Check className="w-3 h-3 mr-1" />Ativo</> : <><Power className="w-3 h-3 mr-1" />Off</>}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-center">Gateway PIX via Valorion</CardDescription>
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
            <Card className={`border-primary/30 ${!interEnabled ? 'opacity-60' : ''}`}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Switch 
                    checked={interEnabled} 
                    onCheckedChange={(checked) => toggleGatewayEnabled('inter', checked)}
                    disabled={isTogglingEnabled === 'inter'}
                    className="h-4 w-8 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4"
                  />
                  <CardTitle className="text-sm font-bold text-primary">BANCO INTER</CardTitle>
                  <Badge variant="outline" className={interEnabled ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-xs" : "text-muted-foreground text-xs"}>
                    {interEnabled ? <><Check className="w-3 h-3 mr-1" />Ativo</> : <><Power className="w-3 h-3 mr-1" />Off</>}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-center">Gateway PIX via Banco Inter</CardDescription>
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

            {/* EFI PAY Card */}
            <Card className={`border-primary/30 ${!efiEnabled ? 'opacity-60' : ''}`}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Switch 
                    checked={efiEnabled} 
                    onCheckedChange={(checked) => toggleGatewayEnabled('efi', checked)}
                    disabled={isTogglingEnabled === 'efi'}
                    className="h-4 w-8 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4"
                  />
                  <CardTitle className="text-sm font-bold text-primary">EFI PAY</CardTitle>
                  <Badge variant="outline" className={efiEnabled ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-xs" : "text-muted-foreground text-xs"}>
                    {efiEnabled ? <><Check className="w-3 h-3 mr-1" />Ativo</> : <><Power className="w-3 h-3 mr-1" />Off</>}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-center">Gateway PIX via EFI Pay (Gerencianet)</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Taxas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa (%)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={efiFeeRate} onChange={e => setEfiFeeRate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Fixo (R$)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={efiFixedFee} onChange={e => setEfiFixedFee(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => saveFeeSettings('efi', efiFeeRate, efiFixedFee)} className="w-full h-7 text-xs">
                    Salvar Taxas
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => { loadEfiCredentials(); setShowEfiDialog(true); }} className="flex-1 h-7 text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Configurar Credenciais
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => testConnection('efi')} disabled={isTesting === 'efi'} className="h-7 text-xs">
                    {isTesting === 'efi' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3 mr-1" />Testar</>}
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
              <div className="relative">
                <Input 
                  type={showAtivusKey ? "text" : "password"} 
                  placeholder="Digite sua chave API" 
                  value={ativusApiKey} 
                  onChange={e => setAtivusApiKey(e.target.value)} 
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowAtivusKey(!showAtivusKey)}
                >
                  {showAtivusKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
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
              <div className="relative">
                <Input 
                  type={showValorionKey ? "text" : "password"} 
                  placeholder="Digite sua chave API" 
                  value={valorionApiKey} 
                  onChange={e => setValorionApiKey(e.target.value)} 
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowValorionKey(!showValorionKey)}
                >
                  {showValorionKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
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
                <div className="relative">
                  <Input 
                    type={showInterClientId ? "text" : "password"} 
                    placeholder="Digite o Client ID" 
                    value={interConfig.clientId} 
                    onChange={e => setInterConfig(prev => ({ ...prev, clientId: e.target.value }))} 
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowInterClientId(!showInterClientId)}
                  >
                    {showInterClientId ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <div className="relative">
                  <Input 
                    type={showInterSecret ? "text" : "password"} 
                    placeholder="Digite o Client Secret" 
                    value={interConfig.clientSecret} 
                    onChange={e => setInterConfig(prev => ({ ...prev, clientSecret: e.target.value }))} 
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowInterSecret(!showInterSecret)}
                  >
                    {showInterSecret ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Certificado (.crt)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setShowInterCert(!showInterCert)}
                  >
                    {showInterCert ? <><EyeOff className="h-3 w-3 mr-1" />Ocultar</> : <><Eye className="h-3 w-3 mr-1" />Mostrar</>}
                  </Button>
                </div>
                {showInterCert ? (
                  <textarea 
                    className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-background resize-none font-mono text-xs" 
                    placeholder="Cole o conteúdo do certificado" 
                    value={interConfig.certificate} 
                    onChange={e => setInterConfig(prev => ({ ...prev, certificate: e.target.value }))} 
                  />
                ) : (
                  <div className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
                    {interConfig.certificate ? '••••••••••••••••' : 'Nenhum certificado configurado'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Chave Privada (.key)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setShowInterKey(!showInterKey)}
                  >
                    {showInterKey ? <><EyeOff className="h-3 w-3 mr-1" />Ocultar</> : <><Eye className="h-3 w-3 mr-1" />Mostrar</>}
                  </Button>
                </div>
                {showInterKey ? (
                  <textarea 
                    className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-background resize-none font-mono text-xs" 
                    placeholder="Cole o conteúdo da chave privada" 
                    value={interConfig.privateKey} 
                    onChange={e => setInterConfig(prev => ({ ...prev, privateKey: e.target.value }))} 
                  />
                ) : (
                  <div className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
                    {interConfig.privateKey ? '••••••••••••••••' : 'Nenhuma chave configurada'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <div className="relative">
                  <Input 
                    type={showInterPixKey ? "text" : "password"} 
                    placeholder="Ex: 52027770000121" 
                    value={interConfig.pixKey} 
                    onChange={e => setInterConfig(prev => ({ ...prev, pixKey: e.target.value }))} 
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowInterPixKey(!showInterPixKey)}
                  >
                    {showInterPixKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
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

      {/* EFI Dialog */}
      <AlertDialog open={showEfiDialog} onOpenChange={setShowEfiDialog}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Configurar EFI Pay</AlertDialogTitle>
            <AlertDialogDescription>Configure as credenciais da EFI Pay (Gerencianet).</AlertDialogDescription>
          </AlertDialogHeader>
          {isLoadingEfi ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <div className="relative">
                  <Input 
                    type={showEfiClientId ? "text" : "password"} 
                    placeholder="Digite o Client ID" 
                    value={efiConfig.clientId} 
                    onChange={e => setEfiConfig(prev => ({ ...prev, clientId: e.target.value }))} 
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowEfiClientId(!showEfiClientId)}
                  >
                    {showEfiClientId ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <div className="relative">
                  <Input 
                    type={showEfiSecret ? "text" : "password"} 
                    placeholder="Digite o Client Secret" 
                    value={efiConfig.clientSecret} 
                    onChange={e => setEfiConfig(prev => ({ ...prev, clientSecret: e.target.value }))} 
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowEfiSecret(!showEfiSecret)}
                  >
                    {showEfiSecret ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              
              {/* P12 Upload Section */}
              <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileKey className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Upload Certificado .p12</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Faça upload do arquivo .p12 para extrair automaticamente o certificado e chave privada.
                </p>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Senha do certificado (se houver)"
                    value={p12Password}
                    onChange={e => setP12Password(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <input
                    ref={p12FileInputRef}
                    type="file"
                    accept=".p12,.pfx"
                    onChange={handleP12Upload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => p12FileInputRef.current?.click()}
                    disabled={isConvertingP12}
                  >
                    {isConvertingP12 ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-2" />Convertendo...</>
                    ) : (
                      <><Upload className="w-3 h-3 mr-2" />Selecionar arquivo .p12</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou cole manualmente</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Certificado (.crt / .pem)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setShowEfiCert(!showEfiCert)}
                  >
                    {showEfiCert ? <><EyeOff className="h-3 w-3 mr-1" />Ocultar</> : <><Eye className="h-3 w-3 mr-1" />Mostrar</>}
                  </Button>
                </div>
                {showEfiCert ? (
                  <textarea 
                    className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-background resize-none font-mono text-xs" 
                    placeholder="Cole o conteúdo do certificado" 
                    value={efiConfig.certificate} 
                    onChange={e => setEfiConfig(prev => ({ ...prev, certificate: e.target.value }))} 
                  />
                ) : (
                  <div className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
                    {efiConfig.certificate ? '••••••••••••••••' : 'Nenhum certificado configurado'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Chave Privada (.key)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setShowEfiKey(!showEfiKey)}
                  >
                    {showEfiKey ? <><EyeOff className="h-3 w-3 mr-1" />Ocultar</> : <><Eye className="h-3 w-3 mr-1" />Mostrar</>}
                  </Button>
                </div>
                {showEfiKey ? (
                  <textarea 
                    className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-background resize-none font-mono text-xs" 
                    placeholder="Cole o conteúdo da chave privada" 
                    value={efiConfig.privateKey} 
                    onChange={e => setEfiConfig(prev => ({ ...prev, privateKey: e.target.value }))} 
                  />
                ) : (
                  <div className="w-full h-20 px-3 py-2 text-sm border rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
                    {efiConfig.privateKey ? '••••••••••••••••' : 'Nenhuma chave configurada'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <div className="relative">
                  <Input 
                    type={showEfiPixKey ? "text" : "password"} 
                    placeholder="CPF, CNPJ, Email ou Telefone" 
                    value={efiConfig.pixKey} 
                    onChange={e => setEfiConfig(prev => ({ ...prev, pixKey: e.target.value }))} 
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowEfiPixKey(!showEfiPixKey)}
                  >
                    {showEfiPixKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <select 
                  className="w-full h-9 px-3 py-2 text-sm border rounded-md bg-background"
                  value={efiConfig.environment}
                  onChange={e => setEfiConfig(prev => ({ ...prev, environment: e.target.value }))}
                >
                  <option value="production">Produção</option>
                  <option value="sandbox">Sandbox (Homologação)</option>
                </select>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={saveEfiCredentials} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
