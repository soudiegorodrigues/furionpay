import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Eye, EyeOff, Save, ExternalLink, CheckCircle, AlertCircle, 
  Loader2, RefreshCw, Activity, Clock, ChevronDown, Upload, Info
} from "lucide-react";
import utmifyLogo from "@/assets/utmify-logo.png";

// Validation for UTMify API token
const validateUtmifyToken = (token: string): { valid: boolean; message?: string } => {
  const trimmed = token.trim();
  
  if (!trimmed) {
    return { valid: false, message: 'Digite o token da API' };
  }
  
  // Token should not be a URL or UTM template
  if (trimmed.startsWith('?') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { valid: false, message: 'Isso parece ser uma URL, não um token de API. Acesse Utmify → Configurações → API → Token' };
  }
  
  // Token should not contain URL-like characters
  if (/[&=?]/.test(trimmed)) {
    return { valid: false, message: 'Token inválido. O token não deve conter caracteres como &, = ou ?. Verifique se copiou o token correto do UTMify' };
  }
  
  // Token should have minimum length
  if (trimmed.length < 20) {
    return { valid: false, message: 'Token muito curto. Verifique se copiou o token completo do UTMify' };
  }
  
  return { valid: true };
};

interface SyncStats {
  pixGerados: number;
  pixPagos: number;
  transactions: Array<{
    id: string;
    txid: string;
    amount: number;
    status: string;
    donor_name: string;
    product_name: string;
    utm_data: any;
    user_id: string;
  }>;
}

interface UtmifySummary {
  today_total: number;
  today_success: number;
  today_failure: number;
  last_event: string | null;
  last_24h_total: number;
  last_24h_success: number;
}

export interface UtmifyInitialData {
  enabled: boolean;
  apiToken: string;
  isConfigured: boolean;
  summary?: UtmifySummary | null;
}

interface UtmifySectionProps {
  initialData?: UtmifyInitialData;
}

export function UtmifySection({ initialData }: UtmifySectionProps) {
  const [saving, setSaving] = useState(false);
  const [savingEnabled, setSavingEnabled] = useState(false);
  const [enabled, setEnabled] = useState(initialData?.enabled ?? false);
  const [apiToken, setApiToken] = useState(initialData?.apiToken ?? "");
  const [showToken, setShowToken] = useState(false);
  const [isConfigured, setIsConfigured] = useState(initialData?.isConfigured ?? false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [sendInitiateCheckout, setSendInitiateCheckout] = useState(true);
  const [savingInitiateCheckout, setSavingInitiateCheckout] = useState(false);

  // Monitoring state
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [summary, setSummary] = useState<UtmifySummary | null>(initialData?.summary ?? null);

  // Manual sync state
  const [showSyncConfirmDialog, setShowSyncConfirmDialog] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingSyncStats, setIsLoadingSyncStats] = useState(false);

  useEffect(() => {
    if (!initialData) {
      loadSettings();
    }
  }, [initialData]);

  useEffect(() => {
    if (!isConfigured) return;
    
    const fetchData = async () => {
      try {
        setMonitoringLoading(true);
        const { data: summaryData } = await supabase.rpc('get_utmify_summary');
        if (summaryData) {
          setSummary(summaryData as unknown as UtmifySummary);
        }
      } catch (error) {
        console.error('Error loading monitoring data:', error);
      } finally {
        setMonitoringLoading(false);
      }
    };
    
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, [isConfigured]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('key, value')
        .eq('user_id', user.id)
        .in('key', ['utmify_enabled', 'utmify_api_token', 'utmify_send_initiate_checkout']);
      
      if (settings) {
        const enabledSetting = settings.find(s => s.key === 'utmify_enabled');
        const tokenSetting = settings.find(s => s.key === 'utmify_api_token');
        const icSetting = settings.find(s => s.key === 'utmify_send_initiate_checkout');
        
        setEnabled(enabledSetting?.value === 'true');
        setSendInitiateCheckout(icSetting?.value !== 'false'); // Default true
        
        if (tokenSetting?.value) {
          setApiToken(tokenSetting.value);
          setIsConfigured(true);
        }
      }
    } catch (error) {
      console.error('Error loading Utmify settings:', error);
    }
  };

  const loadMonitoringData = useCallback(async () => {
    try {
      setMonitoringLoading(true);
      const { data: summaryData } = await supabase.rpc('get_utmify_summary');
      if (summaryData) {
        setSummary(summaryData as unknown as UtmifySummary);
      }
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setMonitoringLoading(false);
    }
  }, []);

  // Auto-save toggle state
  const handleEnabledChange = async (newValue: boolean) => {
    setEnabled(newValue);
    setSavingEnabled(true);
    
    try {
      const { error } = await supabase.rpc('update_user_setting', {
        setting_key: 'utmify_enabled',
        setting_value: newValue.toString()
      });
      
      if (error) throw error;
      
      toast.success(newValue ? 'Integração ativada!' : 'Integração desativada!');
    } catch (error) {
      console.error('Error saving enabled state:', error);
      setEnabled(!newValue); // Revert on error
      toast.error('Erro ao salvar configuração');
    } finally {
      setSavingEnabled(false);
    }
  };

  const handleSaveToken = async () => {
    const validation = validateUtmifyToken(apiToken);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    
    try {
      setSaving(true);

      // Auto-activate integration when saving token
      setEnabled(true);

      // Save both token and enabled state together
      const [tokenResult, enabledResult] = await Promise.all([
        supabase.rpc('update_user_setting', {
          setting_key: 'utmify_api_token',
          setting_value: apiToken.trim()
        }),
        supabase.rpc('update_user_setting', {
          setting_key: 'utmify_enabled',
          setting_value: 'true'
        })
      ]);

      if (tokenResult.error) throw tokenResult.error;
      if (enabledResult.error) throw enabledResult.error;
      
      setIsConfigured(true);
      toast.success('Integração ativada e configurada!');
    } catch (error) {
      console.error('Error saving Utmify settings:', error);
      setEnabled(false); // Revert on error
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleInitiateCheckoutChange = async (newValue: boolean) => {
    setSendInitiateCheckout(newValue);
    setSavingInitiateCheckout(true);
    
    try {
      const { error } = await supabase.rpc('update_user_setting', {
        setting_key: 'utmify_send_initiate_checkout',
        setting_value: newValue.toString()
      });
      
      if (error) throw error;
      
      toast.success(newValue 
        ? 'Eventos de checkout iniciado ativados!' 
        : 'Eventos de checkout iniciado desativados!'
      );
    } catch (error) {
      console.error('Error saving initiate checkout setting:', error);
      setSendInitiateCheckout(!newValue); // Revert on error
      toast.error('Erro ao salvar configuração');
    } finally {
      setSavingInitiateCheckout(false);
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  // Get today's date start in Brazil timezone (America/Sao_Paulo = UTC-3)
  const getTodayStartBrazil = () => {
    // Get current date in Brazil timezone using Intl API
    const brazilDate = new Date().toLocaleDateString('en-CA', { 
      timeZone: 'America/Sao_Paulo' 
    }); // Returns "YYYY-MM-DD"
    
    // Midnight in Brazil (UTC-3) = 03:00 UTC
    return `${brazilDate}T03:00:00.000Z`;
  };

  const loadSyncStats = async () => {
    try {
      setIsLoadingSyncStats(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStart = getTodayStartBrazil();

      const { data: transactions, error } = await supabase
        .from('pix_transactions')
        .select('id, txid, amount, status, donor_name, product_name, utm_data, user_id')
        .eq('user_id', user.id)
        .gte('created_at', todayStart)
        .in('status', ['generated', 'paid']);

      if (error) throw error;

      const pixGerados = transactions?.filter(t => t.status === 'generated').length || 0;
      const pixPagos = transactions?.filter(t => t.status === 'paid').length || 0;

      setSyncStats({
        pixGerados,
        pixPagos,
        transactions: transactions || []
      });
      setShowSyncConfirmDialog(true);
    } catch (error) {
      console.error('Error loading sync stats:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setIsLoadingSyncStats(false);
    }
  };

  const handleManualSync = async () => {
    if (!syncStats || syncStats.transactions.length === 0) {
      toast.error('Nenhuma transação para sincronizar');
      return;
    }

    try {
      setIsSyncing(true);
      let successCount = 0;
      let errorCount = 0;

      for (const tx of syncStats.transactions) {
        try {
          const { error } = await supabase.functions.invoke('utmify-sync', {
            body: {
              txid: tx.txid,
              amount: tx.amount,
              status: tx.status,
              user_id: tx.user_id, // Use the transaction owner's user_id
              donor_name: tx.donor_name,
              product_name: tx.product_name,
              utm_data: tx.utm_data
            }
          });

          if (error) {
            console.error(`Error syncing tx ${tx.txid}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error syncing tx ${tx.txid}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`${successCount} transações sincronizadas com sucesso!`);
      } else {
        toast.warning(`${successCount} sincronizadas, ${errorCount} com erro`);
      }

      setShowSyncConfirmDialog(false);
      setSyncStats(null);
      loadMonitoringData();
    } catch (error) {
      console.error('Error during manual sync:', error);
      toast.error('Erro durante sincronização');
    } finally {
      setIsSyncing(false);
    }
  };

  const successRate = summary ? (summary.today_total > 0 
    ? Math.round((summary.today_success / summary.today_total) * 100) 
    : 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center bg-white shrink-0">
          <img src={utmifyLogo} alt="Utmify" className="w-5 h-5 object-contain" />
        </div>
        <h2 className="text-lg font-bold">Utmify</h2>
        {isConfigured ? (
          <Badge variant="default" className="bg-green-500 hover:bg-green-500 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Configurado
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        )}
            <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => window.open('https://app.utmify.com.br/login/', '_blank')}
        >
          <ExternalLink className="w-3 h-3 mr-1.5" />
          Acessar Utmify
        </Button>
      </div>

      {/* Configuration Card - Compact */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-base">Configuração da API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Enable Toggle - Compact */}
          <div className="flex items-center justify-between p-3 border rounded-lg gap-3">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Ativar integração</Label>
              <p className="text-xs text-muted-foreground truncate">
                Enviar eventos de PIX automaticamente
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={enabled}
                onCheckedChange={handleEnabledChange}
                disabled={savingEnabled}
              />
              {savingEnabled && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* API Token - Compact */}
          <div className="space-y-1.5">
            <Label htmlFor="api-token" className="text-sm">Token da API</Label>
            <div className="relative">
              <Input
                id="api-token"
                type={showToken ? "text" : "password"}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Cole seu token aqui"
                className="pr-9 h-9 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Utmify → Configurações → API → Token
            </p>
          </div>

          {/* Save Token Button */}
          <Button onClick={handleSaveToken} disabled={saving} size="sm" className="h-8">
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isConfigured ? 'Atualizar Token' : 'Salvar e Ativar'}
          </Button>

          {/* InitiateCheckout Toggle - Only show when configured */}
          {isConfigured && (
            <div className="flex items-center justify-between p-3 border rounded-lg gap-3 border-dashed">
              <div className="min-w-0">
                <Label className="text-sm font-medium">Enviar checkouts iniciados</Label>
                <p className="text-xs text-muted-foreground">
                  Envia eventos quando o popup de checkout abre (antes do PIX)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={sendInitiateCheckout}
                  onCheckedChange={handleInitiateCheckoutChange}
                  disabled={savingInitiateCheckout}
                />
                {savingInitiateCheckout && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation Alert - Show when configured */}
      {isConfigured && (
        <Alert className="bg-blue-500/5 border-blue-500/20">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs text-muted-foreground">
            <strong className="text-foreground block mb-1">Entenda as "vendas pendentes" no UTMify</strong>
            O UTMify mostra o funil completo: <span className="text-yellow-600 font-medium">Checkout Iniciado</span> → <span className="text-orange-600 font-medium">PIX Gerado</span> → <span className="text-green-600 font-medium">Pago</span>.
            Os eventos de "checkout iniciado" são visitantes que abriram o popup, mesmo sem gerar PIX ou pagar. 
            Na Furion, você só vê transações reais (PIX gerados e pagos). Se preferir ver apenas transações reais no UTMify, 
            desative "Enviar checkouts iniciados" acima.
          </AlertDescription>
        </Alert>
      )}

      {/* Monitoring Card - Compact */}
      {isConfigured && (
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Monitoramento</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-2 text-xs"
                  onClick={loadSyncStats}
                  disabled={isLoadingSyncStats || isSyncing}
                >
                  {isLoadingSyncStats ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Sincronizar
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={loadMonitoringData}
                  disabled={monitoringLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${monitoringLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Summary Stats - Compact Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 border rounded-lg text-center">
                <div className="text-lg font-bold text-primary leading-none">
                  {summary?.today_total || 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Eventos</div>
              </div>
              <div className="p-2.5 border rounded-lg text-center">
                <div className="text-lg font-bold text-green-500 leading-none">
                  {successRate}%
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Sucesso</div>
              </div>
              <div className="p-2.5 border rounded-lg text-center">
                <div className="text-lg font-bold text-red-500 leading-none">
                  {summary?.today_failure || 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Falhas</div>
              </div>
              <div className="p-2.5 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {formatTimeAgo(summary?.last_event || null)}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Último</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Confirmation Dialog */}
      <AlertDialog open={showSyncConfirmDialog} onOpenChange={setShowSyncConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Sincronização Manual
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-sm">
                  Serão sincronizadas apenas as transações de <strong>HOJE</strong>:
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-500">
                      {syncStats?.pixGerados || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">PIX Gerados</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {syncStats?.pixPagos || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">PIX Pagos</div>
                  </div>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-bold text-primary">
                    {(syncStats?.pixGerados || 0) + (syncStats?.pixPagos || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total de transações</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleManualSync}
              disabled={isSyncing || !syncStats || syncStats.transactions.length === 0}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Confirmar Sincronização'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* How it works - Collapsible */}
      <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center bg-white shrink-0">
                    <img src={utmifyLogo} alt="Utmify" className="w-4 h-4 object-contain" />
                  </div>
                  <CardTitle className="text-sm">Como Funciona</CardTitle>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${howItWorksOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 bg-yellow-500/10 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-500">
                      1
                    </div>
                    <span className="text-sm font-medium">PIX Gerado</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enviamos o pedido com status "waiting_payment"
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center text-[10px] font-bold text-green-500">
                      2
                    </div>
                    <span className="text-sm font-medium">PIX Pago</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Atualizamos o pedido com status "paid"
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-xs font-medium mb-1.5">Dados Enviados</h4>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>• orderId, customer (nome, email, tel, CPF)</div>
                  <div>• products (nome, valor), UTM params</div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
