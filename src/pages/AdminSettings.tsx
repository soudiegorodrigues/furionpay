import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Key, User, Activity, LogOut, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdminSettingsData {
  spedpay_api_key: string;
  recipient_id: string;
  meta_pixel_id: string;
  meta_pixel_token: string;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettingsData>({
    spedpay_api_key: "",
    recipient_id: "",
    meta_pixel_id: "",
    meta_pixel_token: "",
  });
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
        meta_pixel_id: "",
        meta_pixel_token: "",
      };

      if (data) {
        data.forEach((item: { key: string; value: string }) => {
          if (item.key in settingsMap) {
            settingsMap[item.key as keyof AdminSettingsData] = item.value || "";
          }
        });
      }

      setSettings(settingsMap);
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

  const handleSave = async () => {
    if (!adminToken) return;

    setIsSaving(true);

    try {
      const updates = Object.entries(settings).map(([key, value]) =>
        supabase.rpc('update_admin_setting', {
          input_token: adminToken,
          setting_key: key,
          setting_value: value,
        })
      );

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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
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
          </CardContent>
        </Card>

        {/* Meta Pixel Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Meta Pixel (Facebook)
            </CardTitle>
            <CardDescription>
              Configure o rastreamento de eventos do Meta Pixel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pixel_id">Pixel ID</Label>
              <Input
                id="pixel_id"
                type="text"
                placeholder="Digite o ID do Pixel"
                value={settings.meta_pixel_id}
                onChange={(e) => setSettings(s => ({ ...s, meta_pixel_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pixel_token">Access Token</Label>
              <Input
                id="pixel_token"
                type="password"
                placeholder="Digite o token de acesso"
                value={settings.meta_pixel_token}
                onChange={(e) => setSettings(s => ({ ...s, meta_pixel_token: e.target.value }))}
              />
            </div>
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
