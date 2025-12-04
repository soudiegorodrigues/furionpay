import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import BlockedUserAlert from "@/components/BlockedUserAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Key, Activity, LogOut, Save, Loader2, Plus, Trash2, BarChart3, AlertTriangle, Layout, Bell, Pencil, ChevronDown, Link, Copy, Check, Eye, Globe, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DonationPopup } from "@/components/DonationPopup";
import { DonationPopupSimple } from "@/components/DonationPopupSimple";
import { DonationPopupClean } from "@/components/DonationPopupClean";
import { DonationPopupDirect } from "@/components/DonationPopupDirect";
import { DonationPopupHot } from "@/components/DonationPopupHot";
import { DonationPopupLanding } from "@/components/DonationPopupLanding";
import { DonationPopupInstituto } from "@/components/DonationPopupInstituto";
interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken: string;
}
interface AvailableDomain {
  id: string;
  domain: string;
  name: string | null;
}
interface PopupModelStats {
  popup_model: string;
  total_generated: number;
  total_paid: number;
  conversion_rate: number;
}
interface AdminSettingsData {
  spedpay_api_key: string;
  product_name: string;
  meta_pixels: string;
  popup_model: string;
  social_proof_enabled: boolean;
  selected_domain: string;
  fixed_amount: string;
}
const AdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettingsData>({
    spedpay_api_key: "",
    product_name: "",
    meta_pixels: "[]",
    popup_model: "boost",
    social_proof_enabled: false,
    selected_domain: "",
    fixed_amount: "100"
  });
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [availableDomains, setAvailableDomains] = useState<AvailableDomain[]>([]);
  const [popupStats, setPopupStats] = useState<PopupModelStats[]>([]);
  const [editingPixelId, setEditingPixelId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingGlobal, setIsResettingGlobal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPopupPreview, setShowPopupPreview] = useState(false);
  const navigate = useNavigate();
  const {
    isAuthenticated,
    loading,
    signOut,
    user,
    isBlocked
  } = useAdminAuth();
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      loadSettings();
      loadAvailableDomains();
      loadPopupStats();
      checkAdminRole();
    }
  }, [isAuthenticated, loading, navigate]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin_authenticated');
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const loadAvailableDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('available_domains')
        .select('id, domain, name')
        .eq('is_active', true)
        .order('domain');
      
      if (error) throw error;
      setAvailableDomains(data || []);
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };

  const loadPopupStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_popup_model_stats');
      if (error) throw error;
      setPopupStats(data || []);
    } catch (error) {
      console.error('Error loading popup stats:', error);
    }
  };

  const getConversionRate = (model: string): string => {
    const stat = popupStats.find(s => s.popup_model === model);
    if (!stat || stat.total_generated === 0) return '0%';
    return `${stat.conversion_rate}%`;
  };
  const loadSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_user_settings');
      if (error) throw error;
      const settingsMap: AdminSettingsData = {
        spedpay_api_key: "",
        product_name: "",
        meta_pixels: "[]",
        popup_model: "boost",
        social_proof_enabled: false,
        selected_domain: "",
        fixed_amount: "100"
      };
      if (data) {
        (data as {
          key: string;
          value: string;
        }[]).forEach(item => {
          if (item.key === 'spedpay_api_key') {
            settingsMap.spedpay_api_key = item.value || "";
          } else if (item.key === 'product_name') {
            settingsMap.product_name = item.value || "";
          } else if (item.key === 'meta_pixels') {
            settingsMap.meta_pixels = item.value || "[]";
          } else if (item.key === 'popup_model') {
            settingsMap.popup_model = item.value || "boost";
          } else if (item.key === 'social_proof_enabled') {
            settingsMap.social_proof_enabled = item.value === "true";
          } else if (item.key === 'selected_domain') {
            settingsMap.selected_domain = item.value || "";
          } else if (item.key === 'fixed_amount') {
            settingsMap.fixed_amount = item.value || "100";
          } else if (item.key === 'meta_pixel_id' && item.value) {
            const oldToken = (data as {
              key: string;
              value: string;
            }[]).find(d => d.key === 'meta_pixel_token')?.value || "";
            settingsMap.meta_pixels = JSON.stringify([{
              id: crypto.randomUUID(),
              pixelId: item.value,
              accessToken: oldToken
            }]);
          }
        });
      }
      setSettings(settingsMap);
      try {
        const parsedPixels = JSON.parse(settingsMap.meta_pixels);
        setPixels(Array.isArray(parsedPixels) ? parsedPixels : []);
      } catch {
        setPixels([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive"
      });
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };
  const addPixel = () => {
    const newPixel: MetaPixel = {
      id: crypto.randomUUID(),
      name: "",
      pixelId: "",
      accessToken: ""
    };
    setPixels([...pixels, newPixel]);
  };
  const removePixel = (id: string) => {
    setPixels(pixels.filter(p => p.id !== id));
  };
  const updatePixel = (id: string, field: 'name' | 'pixelId' | 'accessToken', value: string) => {
    setPixels(pixels.map(p => p.id === id ? {
      ...p,
      [field]: value
    } : p));
  };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const pixelsJson = JSON.stringify(pixels);
      const updates = [supabase.rpc('update_user_setting', {
        setting_key: 'spedpay_api_key',
        setting_value: settings.spedpay_api_key
      }), supabase.rpc('update_user_setting', {
        setting_key: 'product_name',
        setting_value: settings.product_name
      }), supabase.rpc('update_user_setting', {
        setting_key: 'meta_pixels',
        setting_value: pixelsJson
      }), supabase.rpc('update_user_setting', {
        setting_key: 'popup_model',
        setting_value: settings.popup_model
      }), supabase.rpc('update_user_setting', {
        setting_key: 'social_proof_enabled',
        setting_value: settings.social_proof_enabled.toString()
      }), supabase.rpc('update_user_setting', {
        setting_key: 'selected_domain',
        setting_value: settings.selected_domain
      }), supabase.rpc('update_user_setting', {
        setting_key: 'fixed_amount',
        setting_value: settings.fixed_amount
      })];
      await Promise.all(updates);
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };
  const handleResetDashboard = async () => {
    setIsResetting(true);
    try {
      const {
        error
      } = await supabase.rpc('reset_user_transactions');
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Todas as transações foram apagadas!"
      });
    } catch (error) {
      console.error('Error resetting transactions:', error);
      toast({
        title: "Erro",
        description: "Falha ao resetar transações",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };
  const handleResetGlobalDashboard = async () => {
    setIsResettingGlobal(true);
    try {
      const { error } = await supabase.rpc('reset_pix_transactions_auth');
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Todas as transações da plataforma foram apagadas!"
      });
    } catch (error) {
      console.error('Error resetting global transactions:', error);
      toast({
        title: "Erro",
        description: "Falha ao resetar transações globais",
        variant: "destructive"
      });
    } finally {
      setIsResettingGlobal(false);
    }
  };
  if (loading || isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <BlockedUserAlert isBlocked={isBlocked} />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Configurações</h1>
              <p className="text-sm text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/domains')}>
                  <Globe className="w-4 h-4 mr-2" />
                  Domínios
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
                  <Users className="w-4 h-4 mr-2" />
                  Usuários
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Configurações da API
            </CardTitle>
            <CardDescription>
              Configure as credenciais do SpedPay para processar pagamentos PIX
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api_key">Chave de API (SpedPay)</Label>
              <Input id="api_key" type="password" placeholder="Digite a chave de API" value={settings.spedpay_api_key} onChange={e => setSettings(s => ({
              ...s,
              spedpay_api_key: e.target.value
            }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_name">Nome do Produto</Label>
              <Input id="product_name" type="text" placeholder="Anônimo (padrão)" value={settings.product_name} onChange={e => setSettings(s => ({
              ...s,
              product_name: e.target.value
            }))} />
              <p className="text-xs text-muted-foreground">
                Nome que aparecerá no gateway de pagamento
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shareable Link */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Seu Link de Checkout
            </CardTitle>
            <CardDescription>
              Escolha o domínio e compartilhe o link para receber pagamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Domain Selector */}
            {availableDomains.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Domínio
                </Label>
                <Select
                  value={settings.selected_domain || ""}
                  onValueChange={(value) => setSettings(s => ({ ...s, selected_domain: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um domínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDomains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.domain}>
                        {domain.name ? `${domain.name} (${domain.domain})` : domain.domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Generated Link */}
            <div className="space-y-2">
              <Label>Seu link</Label>
              <div className="flex gap-2">
                <Input 
                  value={settings.selected_domain 
                    ? `https://www.${settings.selected_domain}/?u=${user?.id || ''}` 
                    : `${window.location.origin}/?u=${user?.id || ''}`
                  } 
                  readOnly 
                  className="font-mono text-sm" 
                />
                <Button variant="outline" onClick={() => {
                  const link = settings.selected_domain 
                    ? `https://www.${settings.selected_domain}/?u=${user?.id || ''}` 
                    : `${window.location.origin}/?u=${user?.id || ''}`;
                  navigator.clipboard.writeText(link);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                  toast({
                    title: "Link copiado!",
                    description: "O link foi copiado para sua área de transferência"
                  });
                }}>
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {!settings.selected_domain && availableDomains.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selecione um domínio acima para gerar seu link personalizado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Popup Model Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Modelo do Popup
            </CardTitle>
            <CardDescription>
              Escolha qual modelo de popup será exibido para os visitantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSettings(s => ({
              ...s,
              popup_model: 'boost'
            }))} className={`p-4 rounded-lg border-2 transition-all text-left relative ${settings.popup_model === 'boost' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {/* Mini Preview - Boost Model */}
                <div className="bg-card border border-border rounded-md p-2 mb-3 scale-90">
                  <div className="text-[6px] font-bold text-center mb-1">🚨 Doe agora!</div>
                  <div className="flex gap-1 mb-1">
                    <div className="flex-1 h-4 bg-secondary rounded border border-border flex items-center px-1">
                      <span className="text-[5px] text-muted-foreground">R$</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 mb-1">
                    <div className="h-3 bg-secondary rounded border border-border text-[4px] flex items-center justify-center">🏠</div>
                    <div className="h-3 bg-secondary rounded border border-border text-[4px] flex items-center justify-center">🍖</div>
                    <div className="h-3 bg-secondary rounded border border-border text-[4px] flex items-center justify-center">💉</div>
                  </div>
                  <div className="h-3 bg-primary rounded text-[4px] text-primary-foreground flex items-center justify-center font-medium">Contribuir</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-sm">Modelo Boost</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Order Bump
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">Taxa de conversão: {getConversionRate('boost')}</span>
                </div>
              </button>
              <button onClick={() => setSettings(s => ({
              ...s,
              popup_model: 'simple'
            }))} className={`p-4 rounded-lg border-2 transition-all text-left relative ${settings.popup_model === 'simple' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {/* Mini Preview - Simple Model */}
                <div className="bg-card border border-border rounded-md p-2 mb-3 scale-90">
                  <div className="text-[6px] font-bold text-center mb-1">💚 Escolha o valor</div>
                  <div className="grid grid-cols-2 gap-0.5 mb-1">
                    <div className="h-2.5 bg-secondary rounded border border-border text-[4px] flex items-center justify-center">R$20</div>
                    <div className="h-2.5 bg-secondary rounded border border-border text-[4px] flex items-center justify-center">R$25</div>
                    <div className="h-2.5 bg-secondary rounded border border-border text-[4px] flex items-center justify-center">R$50</div>
                    <div className="h-2.5 bg-primary rounded text-[4px] text-primary-foreground flex items-center justify-center">R$100</div>
                  </div>
                  <div className="h-3 bg-primary rounded text-[4px] text-primary-foreground flex items-center justify-center font-medium">Doar</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-sm">Modelo Simples</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Grade de valores
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">Taxa de conversão: {getConversionRate('simple')}</span>
                </div>
              </button>
              <button onClick={() => setSettings(s => ({
              ...s,
              popup_model: 'clean'
            }))} className={`p-4 rounded-lg border-2 transition-all text-left relative ${settings.popup_model === 'clean' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {/* Mini Preview - Clean Model */}
                <div className="bg-card border border-border rounded-md p-2 mb-3 scale-90">
                  <div className="text-[6px] font-bold text-center mb-1">❤️ Salvando vidas</div>
                  <div className="w-8 h-8 mx-auto bg-secondary rounded border border-border mb-1 flex items-center justify-center">
                    <span className="text-[6px]">QR</span>
                  </div>
                  <div className="h-3 bg-emerald-500 rounded text-[4px] text-white flex items-center justify-center font-medium">COPIAR</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-sm">Modelo Limpo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Design minimalista
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">Taxa de conversão: {getConversionRate('clean')}</span>
                </div>
              </button>
              <button onClick={() => setSettings(s => ({
              ...s,
              popup_model: 'direct'
            }))} className={`p-4 rounded-lg border-2 transition-all text-left relative ${settings.popup_model === 'direct' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {/* Mini Preview - Direct Model */}
                <div className="bg-card border border-border rounded-md p-2 mb-3 scale-90">
                  <div className="text-[6px] font-bold text-center mb-1">💚 Doe R$100</div>
                  <div className="w-8 h-8 mx-auto bg-amber-50 rounded border border-amber-200 mb-1 flex items-center justify-center">
                    <span className="text-[6px]">QR</span>
                  </div>
                  <div className="h-3 bg-emerald-500 rounded text-[4px] text-white flex items-center justify-center font-medium">Copiar PIX</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-sm">Modelo Direto</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PIX automático
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">Taxa de conversão: {getConversionRate('direct')}</span>
                </div>
              </button>
              <button onClick={() => setSettings(s => ({
              ...s,
              popup_model: 'hot'
            }))} className={`p-4 rounded-lg border-2 transition-all text-left relative ${settings.popup_model === 'hot' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {/* Mini Preview - Hot Model */}
                <div className="bg-gradient-to-r from-rose-400 to-orange-300 rounded-md p-2 mb-3 scale-90">
                  <div className="text-[6px] font-bold text-center text-white mb-1">📧 Email</div>
                  <div className="bg-white rounded p-1">
                    <div className="h-2 bg-slate-100 rounded mb-1"></div>
                    <div className="h-3 bg-gradient-to-r from-rose-400 to-orange-300 rounded text-[4px] text-white flex items-center justify-center font-medium">Pagar</div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-sm">Modelo Hot</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastro + PIX
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">Taxa de conversão: {getConversionRate('hot')}</span>
                </div>
              </button>
              <button onClick={() => setSettings(s => ({
              ...s,
              popup_model: 'landing'
            }))} className={`p-4 rounded-lg border-2 transition-all text-left relative ${settings.popup_model === 'landing' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {/* Mini Preview - Landing Model */}
                <div className="bg-gradient-to-b from-emerald-50 to-white rounded-md p-2 mb-3 scale-90 border border-slate-100">
                  <div className="text-[6px] font-bold text-emerald-600 mb-1">🏠 Landing</div>
                  <div className="grid grid-cols-2 gap-0.5 mb-1">
                    <div className="h-2 bg-slate-100 rounded text-[3px]"></div>
                    <div className="h-2 bg-slate-100 rounded text-[3px]"></div>
                  </div>
                  <div className="h-3 bg-emerald-500 rounded text-[4px] text-white flex items-center justify-center font-medium">CONTRIBUIR</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-sm">Modelo Vakinha</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estilo Vakinha
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">Taxa de conversão: {getConversionRate('landing')}</span>
                </div>
              </button>
              <button onClick={() => setSettings(s => ({
              ...s,
              popup_model: 'instituto'
            }))} className={`p-4 rounded-lg border-2 transition-all text-left relative ${settings.popup_model === 'instituto' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {/* Mini Preview - Instituto Model */}
                <div className="bg-gradient-to-b from-pink-50 to-white rounded-md p-2 mb-3 scale-90 border border-pink-200">
                  <div className="text-[6px] font-bold text-pink-600 mb-1">💖 Meta: R$ 200.000</div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full mb-1">
                    <div className="h-full w-4/5 bg-gradient-to-r from-cyan-400 to-green-400 rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-0.5 mb-1">
                    <div className="h-2 bg-pink-500 rounded text-[3px] text-white flex items-center justify-center">R$30</div>
                    <div className="h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded text-[3px] text-white flex items-center justify-center">💛 R$50</div>
                  </div>
                  <div className="h-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded text-[4px] text-white flex items-center justify-center font-medium">R$ 1000</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-sm">Modelo Instituto</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Barra de progresso
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">Taxa de conversão: {getConversionRate('instituto')}</span>
                </div>
              </button>
            </div>
            
            {/* Fixed Amount for Direct/Hot Model */}
            {(settings.popup_model === 'direct' || settings.popup_model === 'hot') && (
              <div className="pt-4 border-t">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">💡 Valores dinâmicos via URL</p>
                  <p className="text-xs text-muted-foreground">
                    Adicione <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-bold">&amount=VALOR</code> ao link para definir valores diferentes em cada botão:
                  </p>
                  <div className="text-xs font-mono bg-muted p-2 rounded space-y-1">
                    <div>Botão R$50: <span className="text-primary">...?u={user?.id}&amount=50</span></div>
                    <div>Botão R$100: <span className="text-primary">...?u={user?.id}&amount=100</span></div>
                    <div>Botão R$200: <span className="text-primary">...?u={user?.id}&amount=200</span></div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <Button variant="outline" onClick={() => setShowPopupPreview(true)} className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                Visualizar Popup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Social Proof Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações de Prova Social
            </CardTitle>
            <CardDescription>
              Exibe notificações de doações recentes para incentivar novos clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="social-proof">Ativar notificações</Label>
                <p className="text-xs text-muted-foreground">
                  Mostra notificações como "Vanessa R. doou há 45 minutos"
                </p>
              </div>
              <Switch id="social-proof" checked={settings.social_proof_enabled} onCheckedChange={checked => setSettings(s => ({
              ...s,
              social_proof_enabled: checked
            }))} />
            </div>
            {/* Preview */}
            {settings.social_proof_enabled && <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Prévia:</p>
                <div className="flex items-center gap-3 bg-card rounded-xl shadow-sm border border-border px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs">Vanessa R.</span>
                      <span className="text-[10px] text-muted-foreground">há 45 minutos</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Doou no pix</p>
                  </div>
                </div>
              </div>}
          </CardContent>
        </Card>

        {/* Meta Pixel Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Meta Pixels (Facebook)
            </CardTitle>
            <CardDescription>
              Configure múltiplos pixels do Meta para rastreamento de eventos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pixels.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum pixel configurado. Clique em "Adicionar Pixel" para começar.
              </p> : pixels.map((pixel, index) => {
            const isEditing = editingPixelId === pixel.id;
            return <div key={pixel.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setEditingPixelId(isEditing ? null : pixel.id)}>
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                        <span className="text-sm font-medium">
                          {pixel.name || `Pixel #${index + 1}`}
                        </span>
                        {pixel.pixelId && <span className="text-xs text-muted-foreground">
                            ({pixel.pixelId.slice(0, 8)}...)
                          </span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={e => {
                    e.stopPropagation();
                    setEditingPixelId(isEditing ? null : pixel.id);
                  }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={e => {
                    e.stopPropagation();
                    removePixel(pixel.id);
                  }} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {isEditing && <div className="p-4 pt-0 space-y-3 border-t bg-secondary/20">
                        <div className="space-y-2">
                          <Label htmlFor={`pixel_name_${pixel.id}`}>Nome (BM/Perfil)</Label>
                          <Input id={`pixel_name_${pixel.id}`} type="text" placeholder="Ex: BM Principal, Perfil João..." value={pixel.name || ""} onChange={e => updatePixel(pixel.id, 'name', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`pixel_id_${pixel.id}`}>Pixel ID</Label>
                          <Input id={`pixel_id_${pixel.id}`} type="text" placeholder="Digite o ID do Pixel" value={pixel.pixelId} onChange={e => updatePixel(pixel.id, 'pixelId', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`pixel_token_${pixel.id}`}>Access Token (opcional)</Label>
                          <Input id={`pixel_token_${pixel.id}`} type="password" placeholder="Digite o token de acesso" value={pixel.accessToken} onChange={e => updatePixel(pixel.id, 'accessToken', e.target.value)} />
                        </div>
                      </div>}
                  </div>;
          })}
            
            <Button variant="outline" onClick={addPixel} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Pixel
            </Button>

            <Separator />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Eventos rastreados:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li><code>PageView</code> - Quando abre o popup de Checkout</li>
                <li><code>PixGenerated</code> - Quando o QR Code PIX é gerado</li>
                <li><code>Purchase</code> - Quando o pagamento PIX é confirmado</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
          {isSaving ? <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </> : <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>}
        </Button>

        {/* Reset Dashboard */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis que afetam permanentemente seus dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isResetting}>
                  {isResetting ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetando...
                    </> : <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Resetar Meu Dashboard (Apagar Minhas Transações)
                    </>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso irá apagar permanentemente
                    todas as suas transações PIX do dashboard, incluindo histórico de pagamentos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetDashboard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sim, apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground">
              Isso irá zerar todos os seus contadores e remover seu histórico de transações.
            </p>

            {/* Global Reset - Admin Only */}
            {isAdmin && (
              <>
                <Separator className="my-4" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isResettingGlobal}>
                      {isResettingGlobal ? <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resetando Global...
                        </> : <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Resetar Faturamento Global (Todas as Contas)
                        </>}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>⚠️ ATENÇÃO: Ação Crítica!</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá apagar TODAS as transações de TODOS os usuários da plataforma.
                        Isso inclui o histórico completo de pagamentos de todas as contas.
                        Esta ação NÃO pode ser desfeita!
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetGlobalDashboard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Sim, apagar TUDO da plataforma
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground">
                  Isso irá apagar todas as transações de todos os usuários da plataforma.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Popup Preview */}
      {settings.popup_model === 'boost' && (
        <DonationPopup 
          isOpen={showPopupPreview} 
          onClose={() => setShowPopupPreview(false)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {settings.popup_model === 'simple' && (
        <DonationPopupSimple 
          isOpen={showPopupPreview} 
          onClose={() => setShowPopupPreview(false)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {settings.popup_model === 'clean' && (
        <DonationPopupClean 
          isOpen={showPopupPreview} 
          onClose={() => setShowPopupPreview(false)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {settings.popup_model === 'direct' && (
        <DonationPopupDirect 
          isOpen={showPopupPreview} 
          onClose={() => setShowPopupPreview(false)} 
          userId={user?.id}
          fixedAmount={parseFloat(settings.fixed_amount) || 100}
          showCloseButton={true}
        />
      )}
      {settings.popup_model === 'hot' && (
        <DonationPopupHot 
          isOpen={showPopupPreview} 
          onClose={() => setShowPopupPreview(false)} 
          userId={user?.id}
          fixedAmount={parseFloat(settings.fixed_amount) || 19.90}
          showCloseButton={true}
        />
      )}
      {settings.popup_model === 'landing' && (
        <DonationPopupLanding 
          isOpen={showPopupPreview} 
          onClose={() => setShowPopupPreview(false)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
      {settings.popup_model === 'instituto' && (
        <DonationPopupInstituto 
          isOpen={showPopupPreview} 
          onClose={() => setShowPopupPreview(false)} 
          userId={user?.id}
          showCloseButton={true}
        />
      )}
    </div>;
};
export default AdminSettings;