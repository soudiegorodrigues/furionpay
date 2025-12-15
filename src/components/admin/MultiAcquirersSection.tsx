import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Loader2, Check, Settings, Power, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const MultiAcquirersSection = () => {
  const { user, isAdmin } = useAdminAuth();
  const [isTestingInter, setIsTestingInter] = useState(false);
  const [isTestingAtivus, setIsTestingAtivus] = useState(false);
  const [isTestingSpedpay, setIsTestingSpedpay] = useState(false);
  const [showInterConfigDialog, setShowInterConfigDialog] = useState(false);
  const [showAtivusConfigDialog, setShowAtivusConfigDialog] = useState(false);
  const [showSpedpayConfigDialog, setShowSpedpayConfigDialog] = useState(false);
  const [isLoadingInterConfig, setIsLoadingInterConfig] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [interEnabled, setInterEnabled] = useState<boolean | null>(null);
  const [spedpayEnabled, setSpedpayEnabled] = useState<boolean | null>(null);
  const [ativusEnabled, setAtivusEnabled] = useState<boolean | null>(null);
  const [interFeeRate, setInterFeeRate] = useState('');
  const [interFixedFee, setInterFixedFee] = useState('');
  const [spedpayFeeRate, setSpedpayFeeRate] = useState('');
  const [spedpayFixedFee, setSpedpayFixedFee] = useState('');
  const [spedpayApiKey, setSpedpayApiKey] = useState('');
  const [ativusFeeRate, setAtivusFeeRate] = useState('');
  const [ativusFixedFee, setAtivusFixedFee] = useState('');
  const [ativusApiKey, setAtivusApiKey] = useState('');
  const [defaultAcquirer, setDefaultAcquirer] = useState<string>('spedpay');
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
        const ativusState = settings.find(s => s.key === 'ativus_enabled');
        const interFee = settings.find(s => s.key === 'inter_fee_rate');
        const interFixed = settings.find(s => s.key === 'inter_fixed_fee');
        const spedpayFee = settings.find(s => s.key === 'spedpay_fee_rate');
        const spedpayFixed = settings.find(s => s.key === 'spedpay_fixed_fee');
        const spedpayKey = settings.find(s => s.key === 'spedpay_api_key');
        const ativusFee = settings.find(s => s.key === 'ativus_fee_rate');
        const ativusFixed = settings.find(s => s.key === 'ativus_fixed_fee');
        const ativusKey = settings.find(s => s.key === 'ativus_api_key');
        const defaultAcq = settings.find(s => s.key === 'default_acquirer');
        
        // Default to true if not set, false only if explicitly set to 'false'
        setInterEnabled(interState?.value !== 'false');
        setSpedpayEnabled(spedpayState?.value !== 'false');
        setAtivusEnabled(ativusState?.value !== 'false');
        setInterFeeRate(interFee?.value || '');
        setInterFixedFee(interFixed?.value || '');
        setSpedpayFeeRate(spedpayFee?.value || '');
        setSpedpayFixedFee(spedpayFixed?.value || '');
        setSpedpayApiKey(spedpayKey?.value || '');
        setAtivusFeeRate(ativusFee?.value || '');
        setAtivusFixedFee(ativusFixed?.value || '');
        setAtivusApiKey(ativusKey?.value || '');
        setDefaultAcquirer(defaultAcq?.value || 'spedpay');
      } else {
        // No data, default to enabled
        setInterEnabled(true);
        setSpedpayEnabled(true);
        setAtivusEnabled(true);
      }
    } catch (error) {
      console.error('Error loading acquirer states:', error);
      setInterEnabled(true);
      setSpedpayEnabled(true);
      setAtivusEnabled(true);
    } finally {
      setIsLoadingStates(false);
    }
  };

  const toggleAcquirer = async (acquirer: 'inter' | 'spedpay' | 'ativus', enabled: boolean) => {
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: `${acquirer}_enabled`,
        setting_value: enabled ? 'true' : 'false'
      });
      
      if (error) throw error;
      
      if (acquirer === 'inter') {
        setInterEnabled(enabled);
      } else if (acquirer === 'spedpay') {
        setSpedpayEnabled(enabled);
      } else {
        setAtivusEnabled(enabled);
      }
      
      const acquirerNames = { inter: 'Banco Inter', spedpay: 'SpedPay', ativus: 'Ativus Hub' };
      
      toast({
        title: enabled ? "Adquirente Ativada" : "Adquirente Desativada",
        description: `${acquirerNames[acquirer]} foi ${enabled ? 'ativada' : 'desativada'} com sucesso.`
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

  const setAsDefaultAcquirer = async (acquirer: 'inter' | 'spedpay' | 'ativus') => {
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'default_acquirer',
        setting_value: acquirer
      });
      
      if (error) throw error;
      
      setDefaultAcquirer(acquirer);
      
      const acquirerNames = { inter: 'Banco Inter', spedpay: 'SpedPay', ativus: 'Ativus Hub' };
      
      toast({
        title: "Adquirente Principal Definida",
        description: `${acquirerNames[acquirer]} agora é a adquirente padrão do sistema.`
      });
    } catch (error) {
      console.error('Error setting default acquirer:', error);
      toast({
        title: "Erro",
        description: "Falha ao definir adquirente padrão",
        variant: "destructive"
      });
    }
  };

  const saveFeeSettings = async (acquirer: 'inter' | 'spedpay' | 'ativus', feeRate: string, fixedFee: string) => {
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
      
      const acquirerNames = { inter: 'Banco Inter', spedpay: 'SpedPay', ativus: 'Ativus Hub' };
      
      toast({
        title: "Taxas Atualizadas",
        description: `Taxas do ${acquirerNames[acquirer]} salvas com sucesso.`
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

  const saveSpedpayApiKey = async () => {
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'spedpay_api_key',
        setting_value: spedpayApiKey
      });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Chave API do SpedPay atualizada!"
      });
      setShowSpedpayConfigDialog(false);
    } catch (error) {
      console.error('Error saving SpedPay API key:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar chave API",
        variant: "destructive"
      });
    }
  };

  const testSpedpayConnection = async () => {
    setIsTestingSpedpay(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: 0.50,
          donorName: 'Teste Conexão',
          productName: 'Teste SpedPay',
          userId: user?.id
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Conexão OK",
          description: "SpedPay está funcionando corretamente!"
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro ao testar SpedPay:', error);
      toast({
        title: "Erro na conexão",
        description: error.message || "Falha ao conectar com SpedPay",
        variant: "destructive"
      });
    } finally {
      setIsTestingSpedpay(false);
    }
  };

  const saveAtivusApiKey = async () => {
    try {
      const { error } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'ativus_api_key',
        setting_value: ativusApiKey
      });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Chave API do Ativus Hub atualizada!"
      });
      setShowAtivusConfigDialog(false);
    } catch (error) {
      console.error('Error saving Ativus API key:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar chave API",
        variant: "destructive"
      });
    }
  };

  const testAtivusConnection = async () => {
    setIsTestingAtivus(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pix-ativus', {
        body: {
          amount: 0.50,
          donorName: 'Teste Conexão',
          productName: 'Teste Ativus',
          userId: user?.id
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Conexão OK",
          description: "Ativus Hub está funcionando corretamente!"
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro ao testar Ativus:', error);
      toast({
        title: "Erro na conexão",
        description: error.message || "Falha ao conectar com Ativus Hub",
        variant: "destructive"
      });
    } finally {
      setIsTestingAtivus(false);
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
          <Badge variant="secondary" className="text-xs">3</Badge>
        </div>
        <Button variant="outline" disabled>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Adquirente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* BANCO INTER Card */}
        <Card className={`border-primary/50 transition-opacity ${interEnabled === false ? 'opacity-60' : ''}`}>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-primary">BANCO INTER</CardTitle>
                <CardDescription className="text-xs">
                  Gateway PIX via Banco Inter
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingStates ? (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={interEnabled ?? true}
                    onCheckedChange={(checked) => toggleAcquirer('inter', checked)}
                    className="scale-75"
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="flex items-center justify-between py-1.5 px-2 bg-muted/50 rounded">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-emerald-500/10 rounded flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 32 32" fill="none">
                    <path d="M21.8 9.6l-4.4 4.4c-.8.8-2 .8-2.8 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.8-.8 2-.8 2.8 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                    <path d="M21.8 23.8l-4.4-4.4c-.8-.8-2-.8-2.8 0l-4.4 4.4c-.4.4-.4 1 0 1.4l4.4 4.4c.8.8 2 .8 2.8 0l4.4-4.4c.4-.4.4-1 0-1.4z" fill="#10b981"/>
                    <path d="M9.6 21.8l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-4.4 4.4c-.4.4-1 .4-1.4 0z" fill="#10b981"/>
                    <path d="M28.2 17.4l-4.4 4.4c-.4.4-1 .4-1.4 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                  </svg>
                </div>
                <span className="text-xs font-medium">PIX</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{interEnabled !== false ? 'Ativo' : 'Inativo'}</span>
            </div>
            
            {/* Fee Configuration */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Taxas:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={interFeeRate}
                    onChange={(e) => setInterFeeRate(e.target.value)}
                    className="h-7 text-xs"
                    disabled={interEnabled === false}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={interFixedFee}
                    onChange={(e) => setInterFixedFee(e.target.value)}
                    className="h-7 text-xs"
                    disabled={interEnabled === false}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveFeeSettings('inter', interFeeRate, interFixedFee)}
                className="w-full h-6 text-[10px]"
                disabled={interEnabled === false}
              >
                Salvar Taxas
              </Button>
            </div>

            {/* Set as Default */}
            {interEnabled !== false && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Adquirente principal:</span>
                <Switch
                  checked={defaultAcquirer === 'inter'}
                  onCheckedChange={(checked) => {
                    if (checked) setAsDefaultAcquirer('inter');
                  }}
                  className="scale-75"
                />
              </div>
            )}
            
            <div className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t">
              <Badge 
                variant="outline" 
                className={interEnabled !== false
                  ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-[10px] h-5"
                  : "text-muted-foreground border-muted-foreground/30 bg-muted text-[10px] h-5"
                }
              >
                {interEnabled !== false ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Power className="w-2.5 h-2.5 mr-0.5" />}
                {interEnabled !== false ? 'Integrado' : 'Desativado'}
              </Badge>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowInterConfigDialog(true)}
                  className="h-5 text-[10px] px-1.5"
                  disabled={interEnabled === false}
                >
                  <Settings className="w-2.5 h-2.5 mr-0.5" />
                  Config
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testInterConnection}
                  disabled={isTestingInter || interEnabled === false}
                  className="h-5 text-[10px] px-1.5"
                >
                  {isTestingInter ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
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
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-primary">SPEDPAY</CardTitle>
                <CardDescription className="text-xs">
                  Adquirente integrada ao sistema
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingStates ? (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={spedpayEnabled ?? true}
                    onCheckedChange={(checked) => toggleAcquirer('spedpay', checked)}
                    className="scale-75"
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="flex items-center justify-between py-1.5 px-2 bg-muted/50 rounded">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-emerald-500/10 rounded flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 32 32" fill="none">
                    <path d="M21.8 9.6l-4.4 4.4c-.8.8-2 .8-2.8 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.8-.8 2-.8 2.8 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                    <path d="M21.8 23.8l-4.4-4.4c-.8-.8-2-.8-2.8 0l-4.4 4.4c-.4.4-.4 1 0 1.4l4.4 4.4c.8.8 2 .8 2.8 0l4.4-4.4c.4-.4.4-1 0-1.4z" fill="#10b981"/>
                    <path d="M9.6 21.8l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-4.4 4.4c-.4.4-1 .4-1.4 0z" fill="#10b981"/>
                    <path d="M28.2 17.4l-4.4 4.4c-.4.4-1 .4-1.4 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                  </svg>
                </div>
                <span className="text-xs font-medium">PIX</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{spedpayEnabled !== false ? 'Ativo' : 'Inativo'}</span>
            </div>
            
            {/* Fee Configuration */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Taxas:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={spedpayFeeRate}
                    onChange={(e) => setSpedpayFeeRate(e.target.value)}
                    className="h-7 text-xs"
                    disabled={spedpayEnabled === false}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={spedpayFixedFee}
                    onChange={(e) => setSpedpayFixedFee(e.target.value)}
                    className="h-7 text-xs"
                    disabled={spedpayEnabled === false}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveFeeSettings('spedpay', spedpayFeeRate, spedpayFixedFee)}
                className="w-full h-6 text-[10px]"
                disabled={spedpayEnabled === false}
              >
                Salvar Taxas
              </Button>
            </div>

            {/* Set as Default */}
            {spedpayEnabled !== false && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Adquirente principal:</span>
                <Switch
                  checked={defaultAcquirer === 'spedpay'}
                  onCheckedChange={(checked) => {
                    if (checked) setAsDefaultAcquirer('spedpay');
                  }}
                  className="scale-75"
                />
              </div>
            )}
            
            <div className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t">
              <Badge 
                variant="outline" 
                className={spedpayEnabled !== false
                  ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-[10px] h-5"
                  : "text-muted-foreground border-muted-foreground/30 bg-muted text-[10px] h-5"
                }
              >
                {spedpayEnabled !== false ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Power className="w-2.5 h-2.5 mr-0.5" />}
                {spedpayEnabled !== false ? 'Integrado' : 'Desativado'}
              </Badge>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSpedpayConfigDialog(true)}
                  className="h-5 text-[10px] px-1.5"
                  disabled={spedpayEnabled === false}
                >
                  <Settings className="w-2.5 h-2.5 mr-0.5" />
                  Config
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testSpedpayConnection}
                  disabled={isTestingSpedpay || spedpayEnabled === false}
                  className="h-5 text-[10px] px-1.5"
                >
                  {isTestingSpedpay ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    "Testar"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Configuração do SpedPay */}
        <AlertDialog open={showSpedpayConfigDialog} onOpenChange={setShowSpedpayConfigDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurar SpedPay
              </AlertDialogTitle>
              <AlertDialogDescription>
                Configure a chave API global do SpedPay para a plataforma.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="spedpay-api-key">Chave API</Label>
                <Input
                  id="spedpay-api-key"
                  type="password"
                  placeholder="Digite a chave API do SpedPay"
                  value={spedpayApiKey}
                  onChange={(e) => setSpedpayApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Esta chave será usada globalmente pela plataforma FurionPay
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={saveSpedpayApiKey}>
                Salvar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ATIVUS HUB Card */}
        <Card className={`border-primary/50 transition-opacity ${ativusEnabled === false ? 'opacity-60' : ''}`}>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-primary">ATIVUS HUB</CardTitle>
                <CardDescription className="text-xs">
                  Gateway PIX via Ativus Hub
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingStates ? (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={ativusEnabled ?? true}
                    onCheckedChange={(checked) => toggleAcquirer('ativus', checked)}
                    className="scale-75"
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="flex items-center justify-between py-1.5 px-2 bg-muted/50 rounded">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-emerald-500/10 rounded flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 32 32" fill="none">
                    <path d="M21.8 9.6l-4.4 4.4c-.8.8-2 .8-2.8 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.8-.8 2-.8 2.8 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                    <path d="M21.8 23.8l-4.4-4.4c-.8-.8-2-.8-2.8 0l-4.4 4.4c-.4.4-.4 1 0 1.4l4.4 4.4c.8.8 2 .8 2.8 0l4.4-4.4c.4-.4.4-1 0-1.4z" fill="#10b981"/>
                    <path d="M9.6 21.8l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-4.4 4.4c-.4.4-1 .4-1.4 0z" fill="#10b981"/>
                    <path d="M28.2 17.4l-4.4 4.4c-.4.4-1 .4-1.4 0l-4.4-4.4c-.4-.4-.4-1 0-1.4l4.4-4.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4z" fill="#10b981"/>
                  </svg>
                </div>
                <span className="text-xs font-medium">PIX</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{ativusEnabled !== false ? 'Ativo' : 'Inativo'}</span>
            </div>
            
            {/* Fee Configuration */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Taxas:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Taxa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={ativusFeeRate}
                    onChange={(e) => setAtivusFeeRate(e.target.value)}
                    className="h-7 text-xs"
                    disabled={ativusEnabled === false}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={ativusFixedFee}
                    onChange={(e) => setAtivusFixedFee(e.target.value)}
                    className="h-7 text-xs"
                    disabled={ativusEnabled === false}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveFeeSettings('ativus', ativusFeeRate, ativusFixedFee)}
                className="w-full h-6 text-[10px]"
                disabled={ativusEnabled === false}
              >
                Salvar Taxas
              </Button>
            </div>

            {/* Set as Default */}
            {ativusEnabled !== false && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Adquirente principal:</span>
                <Switch
                  checked={defaultAcquirer === 'ativus'}
                  onCheckedChange={(checked) => {
                    if (checked) setAsDefaultAcquirer('ativus');
                  }}
                  className="scale-75"
                />
              </div>
            )}
            
            <div className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t">
              <Badge 
                variant="outline" 
                className={ativusEnabled !== false
                  ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10 text-[10px] h-5"
                  : "text-muted-foreground border-muted-foreground/30 bg-muted text-[10px] h-5"
                }
              >
                {ativusEnabled !== false ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Power className="w-2.5 h-2.5 mr-0.5" />}
                {ativusEnabled !== false ? 'Integrado' : 'Desativado'}
              </Badge>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAtivusConfigDialog(true)}
                  className="h-5 text-[10px] px-1.5"
                  disabled={ativusEnabled === false}
                >
                  <Settings className="w-2.5 h-2.5 mr-0.5" />
                  Config
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testAtivusConnection}
                  disabled={isTestingAtivus || ativusEnabled === false}
                  className="h-5 text-[10px] px-1.5"
                >
                  {isTestingAtivus ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    "Testar"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Configuração do Ativus Hub */}
        <AlertDialog open={showAtivusConfigDialog} onOpenChange={setShowAtivusConfigDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurar Ativus Hub
              </AlertDialogTitle>
              <AlertDialogDescription>
                Configure sua chave API do Ativus Hub para usar a integração.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ativus-api-key">Chave API</Label>
                <Input
                  id="ativus-api-key"
                  type="password"
                  placeholder="Digite sua chave API do Ativus Hub"
                  value={ativusApiKey}
                  onChange={(e) => setAtivusApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Obtenha sua chave API no painel do Ativus Hub
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={saveAtivusApiKey}>
                Salvar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add New Acquirer Card (Placeholder) */}
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-not-allowed opacity-50">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[120px] text-center p-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Adicionar Nova</p>
            <p className="text-[10px] text-muted-foreground">Em breve</p>
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
