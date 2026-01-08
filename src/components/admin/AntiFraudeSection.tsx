import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldCheck, ShieldX, Clock, Hash, Ban, RefreshCw, Save, Activity, Fingerprint, Globe, Lock, Eye, EyeOff, Loader2, Plus, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  fingerprint_blocked: number;
  fingerprint_blocks_24h: number;
  fingerprint_total: number;
  ip_blocked: number;
  ip_blocks_24h: number;
  ip_total: number;
}

interface BlacklistedIP {
  id: string;
  ip_address: string;
  reason: string | null;
  transactions_count: number;
  total_amount: number;
  created_at: string;
  is_active: boolean;
}

export function AntiFraudeSection() {
  const [config, setConfig] = useState<RateLimitConfig>({
    enabled: true,
    maxUnpaidPix: 2,
    windowHours: 36,
    cooldownSeconds: 30
  });
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auth dialog states
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);

  // Disable confirmation dialog
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableConfirmText, setDisableConfirmText] = useState("");

  // IP Blacklist states
  const [blacklistedIPs, setBlacklistedIPs] = useState<BlacklistedIP[]>([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [showAddIPDialog, setShowAddIPDialog] = useState(false);
  const [newIP, setNewIP] = useState("");
  const [newIPReason, setNewIPReason] = useState("");
  const [addingIP, setAddingIP] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadConfig();
    loadStats();
    getCurrentUser();
    loadBlacklistedIPs();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setCurrentUser({ email: user.email });
    }
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .is('user_id', null)
        .in('key', ['rate_limit_enabled', 'rate_limit_max_unpaid', 'rate_limit_window_hours', 'rate_limit_cooldown_seconds']);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setConfig({
          enabled: data.find(d => d.key === 'rate_limit_enabled')?.value !== 'false',
          maxUnpaidPix: parseInt(data.find(d => d.key === 'rate_limit_max_unpaid')?.value || '2'),
          windowHours: parseInt(data.find(d => d.key === 'rate_limit_window_hours')?.value || '36'),
          cooldownSeconds: parseInt(data.find(d => d.key === 'rate_limit_cooldown_seconds')?.value || '30')
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

  const loadBlacklistedIPs = async () => {
    setLoadingBlacklist(true);
    try {
      const { data, error } = await supabase
        .from('ip_blacklist')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBlacklistedIPs((data as BlacklistedIP[]) || []);
      setCurrentPage(1); // Reset to first page when refreshing
    } catch (err) {
      console.error('Error loading blacklisted IPs:', err);
    } finally {
      setLoadingBlacklist(false);
    }
  };

  const addIPToBlacklist = async () => {
    if (!newIP.trim()) {
      toast({
        title: "Erro",
        description: "Digite um IP válido",
        variant: "destructive"
      });
      return;
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIP.trim())) {
      toast({
        title: "IP inválido",
        description: "Digite um endereço IP válido (ex: 192.168.1.1)",
        variant: "destructive"
      });
      return;
    }

    setAddingIP(true);
    try {
      const { error } = await supabase
        .from('ip_blacklist')
        .insert({
          ip_address: newIP.trim(),
          reason: newIPReason.trim() || 'Bloqueio manual pelo admin',
          is_active: true
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "IP já existe",
            description: "Este IP já está na blacklist",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "IP bloqueado",
        description: `O IP ${newIP} foi adicionado à blacklist permanente`
      });
      setNewIP("");
      setNewIPReason("");
      setShowAddIPDialog(false);
      loadBlacklistedIPs();
    } catch (err) {
      console.error('Error adding IP to blacklist:', err);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o IP à blacklist",
        variant: "destructive"
      });
    } finally {
      setAddingIP(false);
    }
  };

  const removeIPFromBlacklist = async (id: string, ip: string) => {
    try {
      const { error } = await supabase
        .from('ip_blacklist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "IP removido",
        description: `O IP ${ip} foi removido da blacklist`
      });
      loadBlacklistedIPs();
    } catch (err) {
      console.error('Error removing IP from blacklist:', err);
      toast({
        title: "Erro",
        description: "Não foi possível remover o IP da blacklist",
        variant: "destructive"
      });
    }
  };

  const toggleIPStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ip_blacklist')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: currentStatus ? "IP desativado" : "IP reativado",
        description: currentStatus ? "O bloqueio foi desativado" : "O bloqueio foi reativado"
      });
      loadBlacklistedIPs();
    } catch (err) {
      console.error('Error toggling IP status:', err);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const settings = [
        { key: 'rate_limit_enabled', value: config.enabled.toString() },
        { key: 'rate_limit_max_unpaid', value: config.maxUnpaidPix.toString() },
        { key: 'rate_limit_window_hours', value: config.windowHours.toString() },
        { key: 'rate_limit_cooldown_seconds', value: config.cooldownSeconds.toString() }
      ];

      for (const setting of settings) {
        const { data: existing } = await supabase
          .from('admin_settings')
          .select('id')
          .is('user_id', null)
          .eq('key', setting.key)
          .maybeSingle();

        if (existing) {
          await supabase.from('admin_settings').update({
            value: setting.value,
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);
        } else {
          await supabase.from('admin_settings').insert({
            key: setting.key,
            value: setting.value,
            user_id: null
          });
        }
      }

      toast({
        title: "Configurações salvas",
        description: "As configurações de anti-fraude foram atualizadas."
      });
    } catch (err) {
      console.error('Error saving config:', err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnblockClick = () => {
    setShowAuthDialog(true);
  };

  const handleAuthenticate = async () => {
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Preencha email e senha",
        variant: "destructive"
      });
      return;
    }

    // Verify email matches current user
    if (currentUser?.email && email.toLowerCase() !== currentUser.email.toLowerCase()) {
      toast({
        title: "Erro",
        description: "Use o email da sua conta atual",
        variant: "destructive"
      });
      return;
    }

    setIsAuthenticating(true);
    try {
      // Verify user is admin first
      const { data: isAdmin } = await supabase.rpc('is_admin_authenticated');
      if (!isAdmin) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem executar esta ação",
          variant: "destructive"
        });
        return;
      }

      // Verify password
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          title: "Erro de autenticação",
          description: "Senha incorreta",
          variant: "destructive"
        });
        return;
      }

      // Close dialog and execute unblock
      setShowAuthDialog(false);
      setEmail("");
      setPassword("");
      await clearBlockedDevices();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha na autenticação",
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const clearBlockedDevices = async () => {
    try {
      const { error } = await supabase
        .from('pix_rate_limits')
        .update({
          blocked_until: null,
          unpaid_count: 0
        })
        .not('blocked_until', 'is', null);

      if (error) throw error;

      toast({
        title: "Dispositivos desbloqueados",
        description: "Todos os dispositivos bloqueados foram liberados."
      });
      loadStats();
    } catch (err) {
      console.error('Error clearing blocked devices:', err);
      toast({
        title: "Erro",
        description: "Não foi possível desbloquear os dispositivos.",
        variant: "destructive"
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

  return (
    <>
      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/15">
                <Lock className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle>Confirmar Desbloqueio</DialogTitle>
            </div>
            <DialogDescription>
              Esta ação irá desbloquear {stats?.total_blocked_devices || 0} dispositivos. Confirme suas credenciais para continuar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowAuthDialog(false); setEmail(""); setPassword(""); }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleAuthenticate}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Desbloquear"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-5xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Sistema Anti-Fraude</CardTitle>
                <CardDescription>Proteja sua plataforma contra abusos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configuration Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4" />
                Configuração
              </div>
              {/* Enable/Disable Switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    Rate Limiting Ativo
                    {config.enabled ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <ShieldX className="h-4 w-4 text-red-500" />
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ativa a proteção contra gerações excessivas
                  </p>
                </div>
                <Switch 
                  checked={config.enabled} 
                  onCheckedChange={checked => {
                    if (!checked) {
                      // Show confirmation dialog when trying to disable
                      setShowDisableConfirm(true);
                    } else {
                      setConfig({ ...config, enabled: true });
                    }
                  }} 
                />
              </div>

              {/* Warning when disabled */}
              {!config.enabled && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                  <ShieldX className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-500">ATENÇÃO: Proteção desativada!</p>
                    <p className="text-xs text-red-400 mt-1">
                      Fraudadores podem gerar PIX ilimitados sem bloqueio. Ative a proteção imediatamente.
                    </p>
                  </div>
                </div>
              )}

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
                  onChange={e => setConfig({ ...config, maxUnpaidPix: parseInt(e.target.value) || 2 })} 
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
                  onChange={e => setConfig({ ...config, windowHours: parseInt(e.target.value) || 36 })} 
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
                  onChange={e => setConfig({ ...config, cooldownSeconds: parseInt(e.target.value) || 30 })} 
                  disabled={!config.enabled} 
                />
                <p className="text-xs text-muted-foreground">
                  Tempo mínimo entre gerações de PIX do mesmo dispositivo
                </p>
              </div>

              <Button onClick={saveConfig} disabled={saving} className="w-full">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Configurações
              </Button>
            </div>

            <div className="border-t" />

            {/* Statistics Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4" />
                Estatísticas
              </div>
              {stats ? (
                <>
                  {/* Totais Gerais */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2">
                        <ShieldX className="h-5 w-5 text-destructive shrink-0" />
                        <div>
                          <p className="text-lg font-bold text-destructive">{stats.total_blocked_devices}</p>
                          <p className="text-xs text-muted-foreground">Bloqueados agora</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-2">
                        <Ban className="h-5 w-5 text-orange-500 shrink-0" />
                        <div>
                          <p className="text-lg font-bold text-orange-500">{stats.blocks_last_24h}</p>
                          <p className="text-xs text-muted-foreground">Bloqueios 24h</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estatísticas Separadas: Fingerprint vs IP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-bold">{stats.total_records}</p>
                        <p className="text-xs text-muted-foreground">Total rastreados</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" onClick={loadStats} className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                    
                    {stats.total_blocked_devices > 0 && (
                      <Button variant="destructive" onClick={handleUnblockClick} className="flex-1">
                        <Ban className="h-4 w-4 mr-2" />
                        Desbloquear ({stats.total_blocked_devices})
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* IP Blacklist Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Ban className="h-4 w-4 text-destructive" />
                  Blacklist de IPs ({blacklistedIPs.filter(ip => ip.is_active).length} ativos)
                </div>
                <Button size="sm" onClick={() => setShowAddIPDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar IP
                </Button>
              </div>

              {loadingBlacklist ? (
                <div className="flex items-center justify-center p-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : blacklistedIPs.length > 0 ? (
                (() => {
                  const totalPages = Math.ceil(blacklistedIPs.length / ITEMS_PER_PAGE);
                  const paginatedIPs = blacklistedIPs.slice(
                    (currentPage - 1) * ITEMS_PER_PAGE,
                    currentPage * ITEMS_PER_PAGE
                  );
                  
                  return (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>IP</TableHead>
                            <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                            <TableHead className="hidden md:table-cell">Transações</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedIPs.map((ip) => (
                            <TableRow key={ip.id} className={!ip.is_active ? "opacity-50" : ""}>
                              <TableCell className="font-mono text-sm">{ip.ip_address}</TableCell>
                              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                                {ip.reason || "-"}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-xs">
                                  {ip.transactions_count} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ip.total_amount || 0)})
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={ip.is_active}
                                  onCheckedChange={() => toggleIPStatus(ip.id, ip.is_active)}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeIPFromBlacklist(ip.id, ip.ip_address)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                          <span className="text-xs text-muted-foreground">
                            {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, blacklistedIPs.length)} de {blacklistedIPs.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span className="hidden sm:inline ml-1">Anterior</span>
                            </Button>
                            <span className="text-sm font-medium px-2">
                              {currentPage} / {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              <span className="hidden sm:inline mr-1">Próximo</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center p-4 text-muted-foreground text-sm border rounded-lg">
                  Nenhum IP na blacklist
                </div>
              )}

              <Button variant="outline" size="sm" onClick={loadBlacklistedIPs} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Blacklist
              </Button>
            </div>

            <div className="border-t" />

            {/* Info Section */}
            <div className="p-4 rounded-lg border-primary/20 bg-primary/5">
              <div className="flex flex-col sm:flex-row gap-4">
                <Shield className="h-10 w-10 text-primary shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold">Como funciona o sistema anti-fraude?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Fingerprint:</strong> Cada dispositivo é identificado por um hash único</li>
                    <li>• <strong>Limite de PIX:</strong> Se o dispositivo atingir o máximo de PIX não pagos, é bloqueado</li>
                    <li>• <strong>Cooldown:</strong> Tempo mínimo obrigatório entre gerações de PIX</li>
                    <li>• <strong>Janela de tempo:</strong> Os PIX não pagos são contados dentro desta janela</li>
                    <li>• <strong>Desbloqueio automático:</strong> O dispositivo é desbloqueado após a janela de tempo expirar</li>
                    <li>• <strong className="text-destructive">Blacklist de IPs:</strong> IPs bloqueados permanentemente não conseguem gerar PIX</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add IP Dialog */}
      <Dialog open={showAddIPDialog} onOpenChange={setShowAddIPDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Adicionar IP à Blacklist
            </DialogTitle>
            <DialogDescription>
              IPs na blacklist são bloqueados permanentemente de gerar PIX.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ip-address">Endereço IP</Label>
              <Input
                id="ip-address"
                placeholder="Ex: 189.5.179.111"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip-reason">Motivo (opcional)</Label>
              <Input
                id="ip-reason"
                placeholder="Ex: Fraude detectada - 18 transações não pagas"
                value={newIPReason}
                onChange={(e) => setNewIPReason(e.target.value)}
              />
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                O bloqueio é permanente. Qualquer pessoa usando este IP não poderá gerar PIX.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddIPDialog(false); setNewIP(""); setNewIPReason(""); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={addIPToBlacklist} disabled={addingIP || !newIP.trim()}>
              {addingIP ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Bloqueando...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Bloquear IP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <ShieldX className="h-5 w-5" />
              Desativar Proteção Anti-Fraude?
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm font-medium text-red-500">⚠️ AÇÃO CRÍTICA DE SEGURANÇA</p>
                <p className="text-xs text-red-400 mt-1">
                  Ao desativar, fraudadores poderão gerar PIX ilimitados sem nenhum bloqueio.
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Para confirmar que você entende os riscos, digite <span className="font-mono font-bold text-foreground">DESATIVAR</span> abaixo:
              </p>
              
              <Input
                value={disableConfirmText}
                onChange={(e) => setDisableConfirmText(e.target.value.toUpperCase())}
                placeholder="Digite DESATIVAR"
                className="font-mono"
              />
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDisableConfirm(false);
                setDisableConfirmText("");
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (disableConfirmText === "DESATIVAR") {
                  setConfig({ ...config, enabled: false });
                  setShowDisableConfirm(false);
                  setDisableConfirmText("");
                  toast({
                    title: "Proteção desativada",
                    description: "Anti-fraude foi desativado. Clique em Salvar para confirmar.",
                    variant: "destructive"
                  });
                }
              }}
              disabled={disableConfirmText !== "DESATIVAR"}
              className="flex-1"
            >
              <ShieldX className="h-4 w-4 mr-2" />
              Confirmar Desativação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
