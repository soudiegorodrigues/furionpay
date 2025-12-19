import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Palette, Save, Image, Loader2, Trash2, Upload, Link, Info, Monitor, Tablet, Smartphone } from "lucide-react";
import { compressImage, compressionPresets } from "@/lib/imageCompression";

interface PersonalizacaoSectionProps {
  userId?: string;
}

export function PersonalizacaoSection({ userId }: PersonalizacaoSectionProps) {
  const [bannerUrl, setBannerUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file, compressionPresets.banner);
      const fileName = `${userId}/banner.webp`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, compressedBlob, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setBannerUrl(urlWithTimestamp);

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

  const handleRemoveBanner = async () => {
    setIsSaving(true);
    try {
      // Delete file from Storage if it's a Supabase Storage URL
      if (bannerUrl && bannerUrl.includes('/banners/')) {
        const urlParts = bannerUrl.split('/banners/');
        if (urlParts[1]) {
          const filePath = urlParts[1].split('?')[0]; // Remove query params
          if (filePath) {
            const { error: deleteError } = await supabase.storage
              .from('banners')
              .remove([filePath]);
            
            if (deleteError) {
              console.error('Error deleting file from storage:', deleteError);
            }
          }
        }
      }

      // Clear URL from database
      const { error } = await supabase.rpc('update_user_setting', {
        setting_key: 'dashboard_banner_url',
        setting_value: ''
      });
      
      if (error) throw error;
      
      setBannerUrl("");
      
      toast({
        title: "Sucesso",
        description: "Banner removido com sucesso!"
      });
    } catch (error: any) {
      console.error('Error removing banner:', error);
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
    <div className="max-w-5xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Personalização</CardTitle>
              <CardDescription>Personalize a aparência do seu dashboard</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seção Banner do Dashboard */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">Banner do Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione uma imagem de banner que será exibida no topo do seu dashboard
                </p>
              </div>
            </div>
          {/* Banner Atual - Mostrar primeiro se existir */}
          {bannerUrl && (
            <div className="space-y-3 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Banner Atual</Label>
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveBanner}
                  disabled={isSaving || isUploading}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remover Banner
                </Button>
              </div>
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={bannerUrl}
                  alt="Preview do banner"
                  className="w-full h-auto object-cover max-h-[100px] sm:max-h-[150px] lg:max-h-[200px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Guia de Tamanho Recomendado */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Tamanho Recomendado</h4>
                <p className="text-sm text-muted-foreground">
                  Para melhor exibição em todos os dispositivos, use imagens com as seguintes dimensões:
                </p>
              </div>
            </div>
            
            {/* Indicador Visual de Dimensões */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="bg-background/50 rounded-md p-3 text-center border border-border">
                <Monitor className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Desktop</p>
                <p className="text-sm font-semibold text-foreground">1920 × 400px</p>
              </div>
              <div className="bg-background/50 rounded-md p-3 text-center border border-border">
                <Tablet className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Tablet</p>
                <p className="text-sm font-semibold text-foreground">1024 × 300px</p>
              </div>
              <div className="bg-background/50 rounded-md p-3 text-center border border-border">
                <Smartphone className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="text-sm font-semibold text-foreground">640 × 200px</p>
              </div>
            </div>
            
            {/* Dica sobre proporção */}
            <div className="flex items-center gap-2 pt-2 border-t border-blue-500/20">
              <div className="w-16 h-4 bg-blue-500/30 rounded-sm flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Proporção ideal: <span className="font-medium">4.8:1</span> (largura × altura). 
                Centralize o conteúdo principal para evitar cortes nas bordas.
              </p>
            </div>
          </div>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {bannerUrl ? 'Trocar Imagem' : 'Enviar Imagem'}
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
                  Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 10MB. 
                  A imagem será otimizada automaticamente.
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
                  Cole a URL de uma imagem pública. Siga as dimensões recomendadas acima.
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
