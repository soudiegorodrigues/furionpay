import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Eye, EyeOff, Save, ExternalLink, CheckCircle, AlertCircle, 
  Loader2, RefreshCw, Activity, Clock, ChevronDown
} from "lucide-react";
import utmifyLogo from "@/assets/utmify-logo.png";

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
  const [enabled, setEnabled] = useState(initialData?.enabled ?? false);
  const [apiToken, setApiToken] = useState(initialData?.apiToken ?? "");
  const [showToken, setShowToken] = useState(false);
  const [isConfigured, setIsConfigured] = useState(initialData?.isConfigured ?? false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Monitoring state
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [summary, setSummary] = useState<UtmifySummary | null>(initialData?.summary ?? null);

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
      
      const { data: enabledData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'utmify_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setEnabled(enabledData?.value === 'true');

      const { data: tokenData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'utmify_api_token')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (tokenData?.value) {
        setApiToken(tokenData.value);
        setIsConfigured(true);
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

  const handleSave = async () => {
    try {
      setSaving(true);

      // Use update_user_setting to save with current user's ID
      const { error: enabledError } = await supabase.rpc('update_user_setting', {
        setting_key: 'utmify_enabled',
        setting_value: enabled.toString()
      });

      if (enabledError) throw enabledError;

      if (apiToken.trim()) {
        const { error: tokenError } = await supabase.rpc('update_user_setting', {
          setting_key: 'utmify_api_token',
          setting_value: apiToken.trim()
        });

        if (tokenError) throw tokenError;
        setIsConfigured(true);
      }

      toast.success('Configurações do Utmify salvas com sucesso!');
    } catch (error) {
      console.error('Error saving Utmify settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
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
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
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

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} size="sm" className="h-8">
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Monitoring Card - Compact */}
      {isConfigured && (
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Monitoramento</CardTitle>
              </div>
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
