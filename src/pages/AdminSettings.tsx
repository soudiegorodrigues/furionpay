// v2.1 - Social Proof removed
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Key, Activity, Save, Loader2, Plus, Trash2, AlertTriangle, Pencil, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken: string;
}
interface AdminSettingsData {
  spedpay_api_key: string;
  meta_pixels: string;
}
const AdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettingsData>({
    spedpay_api_key: "",
    meta_pixels: "[]"
  });
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [editingPixelId, setEditingPixelId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingGlobal, setIsResettingGlobal] = useState(false);
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

  const loadSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_user_settings');
      if (error) throw error;
      const settingsMap: AdminSettingsData = {
        spedpay_api_key: "",
        meta_pixels: "[]"
      };
      if (data) {
        (data as {
          key: string;
          value: string;
        }[]).forEach(item => {
          if (item.key === 'spedpay_api_key') {
            settingsMap.spedpay_api_key = item.value || "";
          } else if (item.key === 'meta_pixels') {
            settingsMap.meta_pixels = item.value || "[]";
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
        setting_key: 'meta_pixels',
        setting_value: pixelsJson
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Personalize suas configurações de pagamento</p>
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
      </div>

    </AdminLayout>
  );
};
export default AdminSettings;