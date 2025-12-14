import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Eye, EyeOff, Save, ExternalLink, CheckCircle, AlertCircle, 
  Loader2, RefreshCw, Activity, Clock
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

export function UtmifySection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Monitoring state
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [summary, setSummary] = useState<UtmifySummary | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (isConfigured) {
      loadMonitoringData();
    }
  }, [isConfigured]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data: enabledData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'utmify_enabled')
        .is('user_id', null)
        .maybeSingle();
      
      setEnabled(enabledData?.value === 'true');

      const { data: tokenData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'utmify_api_token')
        .is('user_id', null)
        .maybeSingle();
      
      if (tokenData?.value) {
        setApiToken(tokenData.value);
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Error loading Utmify settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoringData = useCallback(async () => {
    try {
      setMonitoringLoading(true);

      // Load summary
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

      const { error: enabledError } = await supabase.rpc('update_admin_setting_auth', {
        setting_key: 'utmify_enabled',
        setting_value: enabled.toString()
      });

      if (enabledError) throw enabledError;

      if (apiToken.trim()) {
        const { error: tokenError } = await supabase.rpc('update_admin_setting_auth', {
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
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const successRate = summary ? (summary.today_total > 0 
    ? Math.round((summary.today_success / summary.today_total) * 100) 
    : 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white">
          <img src={utmifyLogo} alt="Utmify" className="w-8 h-8 object-contain" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Utmify</h2>
            {isConfigured ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configurado
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Não configurado
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Rastreamento avançado de UTM e atribuição de conversões
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://app.utmify.com.br/login/', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Acessar Utmify
        </Button>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuração da API</CardTitle>
          <CardDescription>
            Configure sua integração com o Utmify para rastrear conversões e atribuições de UTM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Ativar integração</Label>
              <p className="text-sm text-muted-foreground">
                Enviar eventos de PIX gerado e pago para o Utmify automaticamente
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* API Token */}
          <div className="space-y-2">
            <Label htmlFor="api-token">Token da API (x-api-token)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-token"
                  type={showToken ? "text" : "password"}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Cole seu token da API do Utmify aqui"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontre seu token em: Utmify → Configurações → API → Token de Acesso
            </p>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Monitoring Card */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Monitoramento de Eventos</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMonitoringData}
                disabled={monitoringLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${monitoringLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">
                  {summary?.today_total || 0}
                </div>
                <div className="text-sm text-muted-foreground">Eventos Hoje</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-500">
                  {successRate}%
                </div>
                <div className="text-sm text-muted-foreground">Taxa de Sucesso</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-red-500">
                  {summary?.today_failure || 0}
                </div>
                <div className="text-sm text-muted-foreground">Falhas</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {formatTimeAgo(summary?.last_event || null)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Último Evento</div>
              </div>
            </div>

          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white">
              <img src={utmifyLogo} alt="Utmify" className="w-6 h-6 object-contain" />
            </div>
            <CardTitle className="text-lg">Como Funciona</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-yellow-500/10 rounded-full flex items-center justify-center text-xs font-bold text-yellow-500">
                  1
                </div>
                <span className="font-medium">PIX Gerado</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Quando um PIX é gerado, enviamos o pedido com status "waiting_payment" para o Utmify automaticamente
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center text-xs font-bold text-green-500">
                  2
                </div>
                <span className="font-medium">PIX Pago</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Quando o pagamento é confirmado, atualizamos o pedido com status "paid" no Utmify automaticamente
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Dados Enviados</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>orderId:</strong> ID da transação (txid)</li>
              <li>• <strong>customer:</strong> Nome, email, telefone, CPF</li>
              <li>• <strong>products:</strong> Nome e valor do produto</li>
              <li>• <strong>trackingParameters:</strong> UTM source, medium, campaign, content, term</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
