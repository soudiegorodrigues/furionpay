import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldCheck, ShieldX, Clock, Hash, Ban, RefreshCw, Save, Activity, TrendingUp, Fingerprint, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RateLimitConfig {
  enabled: boolean;
  maxUnpaidPix: number;
  windowHours: number;
  cooldownSeconds: number;
}

interface RateLimitStats {
  total_blocked_devices: number;
  blocks_last_24h: number;
  total_records: number;
  // Estatísticas por Fingerprint
  fingerprint_blocked: number;
  fingerprint_blocks_24h: number;
  fingerprint_total: number;
  // Estatísticas por IP
  ip_blocked: number;
  ip_blocks_24h: number;
  ip_total: number;
}

interface ChartData {
  date: string;
  blocks: number;
  cooldowns: number;
}

const periodFilters = [
  { label: 'Hoje', value: 1 },
  { label: '7 dias', value: 7 },
  { label: '14 dias', value: 14 },
  { label: '30 dias', value: 30 },
];

export function AntiFraudeSection() {
  const [config, setConfig] = useState<RateLimitConfig>({
    enabled: true,
    maxUnpaidPix: 2,
    windowHours: 36,
    cooldownSeconds: 30,
  });
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartPeriod, setChartPeriod] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [chartPeriod]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .is('user_id', null)
        .in('key', [
          'rate_limit_enabled',
          'rate_limit_max_unpaid',
          'rate_limit_window_hours',
          'rate_limit_cooldown_seconds'
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        setConfig({
          enabled: data.find(d => d.key === 'rate_limit_enabled')?.value !== 'false',
          maxUnpaidPix: parseInt(data.find(d => d.key === 'rate_limit_max_unpaid')?.value || '2'),
          windowHours: parseInt(data.find(d => d.key === 'rate_limit_window_hours')?.value || '36'),
          cooldownSeconds: parseInt(data.find(d => d.key === 'rate_limit_cooldown_seconds')?.value || '30'),
        });
      }
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_rate_limit_stats' as any);
      if (error) throw error;
      setStats(data as unknown as RateLimitStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadChartData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_rate_limit_chart_data' as any, { p_days: chartPeriod });
      if (error) throw error;
      setChartData((data as unknown as ChartData[]) || []);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setChartData([]);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const settings = [
        { key: 'rate_limit_enabled', value: config.enabled.toString() },
        { key: 'rate_limit_max_unpaid', value: config.maxUnpaidPix.toString() },
        { key: 'rate_limit_window_hours', value: config.windowHours.toString() },
        { key: 'rate_limit_cooldown_seconds', value: config.cooldownSeconds.toString() },
      ];

      for (const setting of settings) {
        const { data: existing } = await supabase
          .from('admin_settings')
          .select('id')
          .is('user_id', null)
          .eq('key', setting.key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('admin_settings')
            .update({ value: setting.value, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('admin_settings')
            .insert({ key: setting.key, value: setting.value, user_id: null });
        }
      }

      toast({
        title: "Configurações salvas",
        description: "As configurações de anti-fraude foram atualizadas.",
      });
    } catch (err) {
      console.error('Error saving config:', err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearBlockedDevices = async () => {
    try {
      const { error } = await supabase
        .from('pix_rate_limits')
        .update({ blocked_until: null, unpaid_count: 0 })
        .not('blocked_until', 'is', null);

      if (error) throw error;

      toast({
        title: "Dispositivos desbloqueados",
        description: "Todos os dispositivos bloqueados foram liberados.",
      });
      loadStats();
    } catch (err) {
      console.error('Error clearing blocked devices:', err);
      toast({
        title: "Erro",
        description: "Não foi possível desbloquear os dispositivos.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalEvents = chartData.reduce((acc, d) => acc + d.blocks + d.cooldowns, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Sistema Anti-Fraude</h2>
          <p className="text-sm text-muted-foreground">
            Proteja sua plataforma contra abusos e gerações excessivas de PIX
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Configuração
            </CardTitle>
            <CardDescription>
              Ajuste os parâmetros de proteção contra fraude
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Switch */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Rate Limiting Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Ativa a proteção contra gerações excessivas
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            {/* Max Unpaid PIX */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Máximo de PIX não pagos
              </Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={config.maxUnpaidPix}
                onChange={(e) => setConfig({ ...config, maxUnpaidPix: parseInt(e.target.value) || 2 })}
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Quantidade máxima de PIX pendentes antes de bloquear
              </p>
            </div>

            {/* Window Hours */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Janela de tempo (horas)
              </Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={config.windowHours}
                onChange={(e) => setConfig({ ...config, windowHours: parseInt(e.target.value) || 36 })}
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Período para contar PIX não pagos e duração do bloqueio
              </p>
            </div>

            {/* Cooldown Seconds */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Cooldown entre gerações (segundos)
              </Label>
              <Input
                type="number"
                min={5}
                max={300}
                value={config.cooldownSeconds}
                onChange={(e) => setConfig({ ...config, cooldownSeconds: parseInt(e.target.value) || 30 })}
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Tempo mínimo entre gerações de PIX do mesmo dispositivo
              </p>
            </div>

            <Button onClick={saveConfig} disabled={saving} className="w-full">
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estatísticas
            </CardTitle>
            <CardDescription>
              Monitoramento em tempo real do sistema anti-fraude
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats ? (
              <>
                {/* Totais Gerais */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-3">
                      <ShieldX className="h-6 w-6 text-destructive" />
                      <div>
                        <p className="text-xl font-bold text-destructive">{stats.total_blocked_devices}</p>
                        <p className="text-xs text-muted-foreground">Bloqueados agora</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-3">
                      <Ban className="h-6 w-6 text-orange-500" />
                      <div>
                        <p className="text-xl font-bold text-orange-500">{stats.blocks_last_24h}</p>
                        <p className="text-xs text-muted-foreground">Bloqueios 24h</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estatísticas Separadas: Fingerprint vs IP */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Fingerprint Stats */}
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Fingerprint className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-medium text-purple-500">Fingerprint</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Bloqueados</span>
                        <span className="text-sm font-bold text-destructive">{stats.fingerprint_blocked}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">24h</span>
                        <span className="text-sm font-medium text-orange-500">{stats.fingerprint_blocks_24h}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-sm font-medium">{stats.fingerprint_total}</span>
                      </div>
                    </div>
                  </div>

                  {/* IP Stats */}
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium text-blue-500">IP</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Bloqueados</span>
                        <span className="text-sm font-bold text-destructive">{stats.ip_blocked}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">24h</span>
                        <span className="text-sm font-medium text-orange-500">{stats.ip_blocks_24h}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-sm font-medium">{stats.ip_total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Rastreados */}
                <div className="p-3 rounded-lg bg-muted border">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-xl font-bold">{stats.total_records}</p>
                      <p className="text-xs text-muted-foreground">Total rastreados</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button variant="outline" onClick={loadStats} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                  
                  {stats.total_blocked_devices > 0 && (
                    <Button 
                      variant="destructive" 
                      onClick={clearBlockedDevices}
                      className="w-full"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Desbloquear Todos ({stats.total_blocked_devices})
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução de Bloqueios
              </CardTitle>
              <CardDescription>
                Histórico de bloqueios e cooldowns ao longo do tempo
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {periodFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={chartPeriod === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartPeriod(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="blocksGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="cooldownsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="blocks"
                    name="Bloqueios"
                    stroke="hsl(var(--destructive))"
                    fill="url(#blocksGradient)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="cooldowns"
                    name="Cooldowns"
                    stroke="hsl(30, 100%, 50%)"
                    fill="url(#cooldownsGradient)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
              <Shield className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum evento registrado no período</p>
              <p className="text-sm">Os dados aparecerão conforme bloqueios ocorrerem</p>
            </div>
          )}
          
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Bloqueios ({chartData.reduce((acc, d) => acc + Number(d.blocks), 0)})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(30, 100%, 50%)' }} />
              <span className="text-muted-foreground">Cooldowns ({chartData.reduce((acc, d) => acc + Number(d.cooldowns), 0)})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Shield className="h-10 w-10 text-primary shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">Como funciona o sistema anti-fraude?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Fingerprint:</strong> Cada dispositivo é identificado por um hash único</li>
                <li>• <strong>Limite de PIX:</strong> Se o dispositivo atingir o máximo de PIX não pagos, é bloqueado</li>
                <li>• <strong>Cooldown:</strong> Tempo mínimo obrigatório entre gerações de PIX</li>
                <li>• <strong>Janela de tempo:</strong> Os PIX não pagos são contados dentro desta janela</li>
                <li>• <strong>Desbloqueio automático:</strong> O dispositivo é desbloqueado após a janela de tempo expirar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}