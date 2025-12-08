import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Palette, Save, Image, Loader2, Trash2, Upload, Link } from "lucide-react";

const AdminPersonalization = () => {
  const [bannerUrl, setBannerUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, loading, user } = useAdminAuth();

  // Load settings when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/banner.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      // Add timestamp to bust cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setBannerUrl(urlWithTimestamp);

      // Save to settings
      const { error: saveError } = await supabase.rpc('update_user_setting', {
        setting_key: 'dashboard_banner_url',
        setting_value: urlWithTimestamp
      });

      if (saveError) throw saveError;

      toast({
        title: "Sucesso",
        description: "Banner enviado e salvo com sucesso!"
      });
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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


  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminNavigation activeSection="personalizacao" />
        
        <div className="max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Personalização</h2>
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
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Enviar Imagem
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  URL da Imagem
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Selecionar Imagem</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: JPG, PNG, GIF, WebP. Tamanho máximo: 5MB
                  </p>
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando imagem...
                  </div>
                )}
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
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
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar URL
                </Button>
              </TabsContent>
            </Tabs>

            {/* Preview */}
            {bannerUrl && (
              <div className="space-y-2 pt-4 border-t border-border">
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
                <Button variant="outline" onClick={handleClear} disabled={isSaving || isUploading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover Banner
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPersonalization;
