import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Key, Activity, LogOut, Save, Loader2, Plus, Trash2, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MetaPixel {
  id: string;
  pixelId: string;
  accessToken: string;
}

interface AdminSettingsData {
  spedpay_api_key: string;
  recipient_id: string;
  product_name: string;
  meta_pixels: string; // JSON array
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettingsData>({
    spedpay_api_key: "",
    recipient_id: "",
    product_name: "",
    meta_pixels: "[]",
  });
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const adminToken = sessionStorage.getItem('admin_token');

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin');
      return;
    }
    loadSettings();
  }, [adminToken, navigate]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_settings', {
        input_token: adminToken
      });

      if (error) throw error;

      const settingsMap: AdminSettingsData = {
        spedpay_api_key: "",
        recipient_id: "",
        product_name: "",
        meta_pixels: "[]",
      };

      if (data) {
        data.forEach((item: { key: string; value: string }) => {
          if (item.key === 'spedpay_api_key') {
            settingsMap.spedpay_api_key = item.value || "";
          } else if (item.key === 'recipient_id') {
            settingsMap.recipient_id = item.value || "";
          } else if (item.key === 'product_name') {
            settingsMap.product_name = item.value || "";
          } else if (item.key === 'meta_pixels') {
            settingsMap.meta_pixels = item.value || "[]";
          } else if (item.key === 'meta_pixel_id' && item.value) {
            // Migration: convert old single pixel to new format
            const oldToken = data.find((d: { key: string }) => d.key === 'meta_pixel_token')?.value || "";
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
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const addPixel = () => {
    const newPixel: MetaPixel = {
      id: crypto.randomUUID(),
      pixelId: "",
      accessToken: "",
    };
    setPixels([...pixels, newPixel]);
  };

  const removePixel = (id: string) => {
    setPixels(pixels.filter(p => p.id !== id));
  };

  const updatePixel = (id: string, field: 'pixelId' | 'accessToken', value: string) => {
    setPixels(pixels.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleSave = async () => {
    if (!adminToken) return;

    setIsSaving(true);

    try {
      const pixelsJson = JSON.stringify(pixels);
      
      const updates = [
        supabase.rpc('update_admin_setting', {
          input_token: adminToken,
          setting_key: 'spedpay_api_key',
          setting_value: settings.spedpay_api_key,
        }),
        supabase.rpc('update_admin_setting', {
          input_token: adminToken,
          setting_key: 'recipient_id',
          setting_value: settings.recipient_id,
        }),
        supabase.rpc('update_admin_setting', {
          input_token: adminToken,
          setting_key: 'product_name',
          setting_value: settings.product_name,
        }),
        supabase.rpc('update_admin_setting', {
          input_token: adminToken,
          setting_key: 'meta_pixels',
          setting_value: pixelsJson,
        }),
      ];

      await Promise.all(updates);

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    navigate('/admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
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
          <div className="flex gap-2">
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
              <Input
                id="api_key"
                type="password"
                placeholder="Digite a chave de API"
                value={settings.spedpay_api_key}
                onChange={(e) => setSettings(s => ({ ...s, spedpay_api_key: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient_id">Recipient ID</Label>
              <Input
                id="recipient_id"
                type="text"
                placeholder="Digite o ID do recebedor"
                value={settings.recipient_id}
                onChange={(e) => setSettings(s => ({ ...s, recipient_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_name">Nome do Produto</Label>
              <Input
                id="product_name"
                type="text"
                placeholder="Ex: Doação, Contribuição..."
                value={settings.product_name}
                onChange={(e) => setSettings(s => ({ ...s, product_name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Nome que aparecerá no gateway de pagamento
              </p>
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
            {pixels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum pixel configurado. Clique em "Adicionar Pixel" para começar.
              </p>
            ) : (
              pixels.map((pixel, index) => (
                <div key={pixel.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Pixel #{index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePixel(pixel.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`pixel_id_${pixel.id}`}>Pixel ID</Label>
                    <Input
                      id={`pixel_id_${pixel.id}`}
                      type="text"
                      placeholder="Digite o ID do Pixel"
                      value={pixel.pixelId}
                      onChange={(e) => updatePixel(pixel.id, 'pixelId', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`pixel_token_${pixel.id}`}>Access Token (opcional)</Label>
                    <Input
                      id={`pixel_token_${pixel.id}`}
                      type="password"
                      placeholder="Digite o token de acesso"
                      value={pixel.accessToken}
                      onChange={(e) => updatePixel(pixel.id, 'accessToken', e.target.value)}
                    />
                  </div>
                </div>
              ))
            )}
            
            <Button
              variant="outline"
              onClick={addPixel}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Pixel
            </Button>

            <Separator />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Eventos rastreados:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li><code>InitiateCheckout</code> - Quando abre o popup de doação</li>
                <li><code>PixGenerated</code> - Quando o QR Code PIX é gerado</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
