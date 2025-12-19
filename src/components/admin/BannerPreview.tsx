import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Download, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const placa100k = '/placas/placa-100k.webp';
const placa500k = '/placas/placa-500k.webp';
const placa1m = '/placas/placa-1m.webp';


interface BannerPreviewProps {
  userId: string;
  onSave?: (bannerUrl: string) => void;
}

export const BannerPreview = ({ userId, onSave }: BannerPreviewProps) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportImage = async () => {
    if (!bannerRef.current) return;
    
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(bannerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      
      const link = document.createElement('a');
      link.download = 'banner-furionpay.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Banner exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting banner:', error);
      toast.error('Erro ao exportar banner');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerRef.current) return;
    
    setIsSaving(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(bannerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.95);
      });
      
      // Upload to Supabase storage
      const fileName = `banners/${userId}/dashboard-banner-${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-assets')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-assets')
        .getPublicUrl(fileName);
      
      const bannerUrl = urlData.publicUrl;
      
      // Save to admin_settings
      const { error: settingsError } = await supabase
        .from('admin_settings')
        .upsert({
          user_id: userId,
          key: 'dashboard_banner_url',
          value: bannerUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,key',
        });
      
      if (settingsError) throw settingsError;
      
      toast.success('Banner salvo e aplicado ao dashboard!');
      onSave?.(bannerUrl);
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Erro ao salvar banner. Tente exportar e fazer upload manual.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5 text-primary" />
          Preview do Banner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Banner Preview Container */}
        <div className="overflow-hidden rounded-lg border border-border/50 shadow-lg">
          <div 
            ref={bannerRef}
            className="relative w-full overflow-hidden"
            style={{ 
              aspectRatio: '1920/400',
              background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 30%, #2d0a0a 60%, #4a0f0f 100%)',
            }}
          >
            {/* Subtle pattern overlay */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.3) 0%, transparent 50%),
                                  radial-gradient(circle at 80% 50%, rgba(220, 38, 38, 0.2) 0%, transparent 40%)`,
              }}
            />
            
            {/* Content Container */}
            <div className="relative flex h-full items-center justify-between px-8 md:px-16">
              {/* Left side - Plaques */}
              <div className="flex items-center gap-3 md:gap-6">
                <img 
                  src={placa100k} 
                  alt="Placa 100K" 
                  className="h-20 w-auto object-contain drop-shadow-2xl md:h-32 lg:h-36"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))' }}
                />
                <img 
                  src={placa500k} 
                  alt="Placa 500K" 
                  className="h-24 w-auto object-contain drop-shadow-2xl md:h-36 lg:h-40"
                  style={{ filter: 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.4))' }}
                />
                <img 
                  src={placa1m} 
                  alt="Placa 1M" 
                  className="h-20 w-auto object-contain drop-shadow-2xl md:h-32 lg:h-36"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))' }}
                />
              </div>
              
              {/* Right side - Text */}
              <div className="flex flex-col items-end gap-2 text-right md:gap-4">
                <div className="space-y-1">
                  <p 
                    className="text-xs font-medium uppercase tracking-widest text-white/70 md:text-sm"
                  >
                    Taxa Exclusiva
                  </p>
                  <p 
                    className="text-2xl font-bold text-white md:text-4xl lg:text-5xl"
                    style={{ 
                      textShadow: '0 0 30px rgba(220, 38, 38, 0.5), 0 2px 10px rgba(0,0,0,0.5)',
                    }}
                  >
                    <span className="text-red-500">3,99%</span>
                    <span className="mx-2 text-white/60">+</span>
                    <span className="text-white">R$19,99</span>
                  </p>
                </div>
                
                <div 
                  className="mt-2 rounded-full border border-red-500/30 bg-gradient-to-r from-red-600/20 to-red-500/10 px-4 py-1.5 backdrop-blur-sm md:px-6 md:py-2"
                >
                  <p 
                    className="text-sm font-bold uppercase tracking-wider text-red-400 md:text-lg lg:text-xl"
                    style={{ textShadow: '0 0 20px rgba(220, 38, 38, 0.8)' }}
                  >
                    Zero Retenção
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bottom gradient fade */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.5), transparent)',
              }}
            />
          </div>
        </div>

        {/* Info text */}
        <p className="text-center text-sm text-muted-foreground">
          Dimensões: 1920 × 400px • Formato ideal para o dashboard
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={handleExportImage}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar PNG
          </Button>
          
          <Button
            onClick={handleSaveBanner}
            disabled={isSaving}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Aprovar e Salvar no Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
