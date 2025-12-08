import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Palette, Save, Image, Loader2, Trash2 } from "lucide-react";

const AdminPersonalization = () => {
  const [bannerUrl, setBannerUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, loading } = useAdminAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin');
      return;
    }
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated, loading, navigate]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_settings');
      if (error) throw error;
      
      const settings = data as { key: string; value: string }[] || [];
      const banner = settings.find(s => s.key === 'dashboard_banner_url');
      if (banner) {
        setBannerUrl(banner.value || "");
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('update_user_setting', {
        setting_key: 'dashboard_banner_url',
        setting_value: bannerUrl
      });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Banner atualizado com sucesso!"
      });
    } catch (error: any) {
      console.error('Error saving banner:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar banner",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setBannerUrl("");
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('update_user_setting', {
        setting_key: 'dashboard_banner_url',
        setting_value: ''
      });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Banner removido com sucesso!"
      });
    } catch (error: any) {
      console.error('Error clearing banner:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover banner",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Personalização</h1>
            <p className="text-muted-foreground text-sm">Personalize a aparência do seu dashboard</p>
          </div>
        </div>

        {/* Banner Config */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Banner do Dashboard
            </CardTitle>
            <CardDescription>
              Adicione uma imagem de banner que será exibida no topo do seu dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banner-url">URL da Imagem</Label>
              <Input
                id="banner-url"
                type="url"
                placeholder="https://exemplo.com/imagem.png"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use uma URL de imagem pública. Tamanho recomendado: 1200x300 pixels
              </p>
            </div>

            {/* Preview */}
            {bannerUrl && (
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={bannerUrl}
                    alt="Preview do banner"
                    className="w-full h-auto object-cover max-h-[200px]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Banner
              </Button>
              {bannerUrl && (
                <Button variant="outline" onClick={handleClear} disabled={isSaving}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPersonalization;
