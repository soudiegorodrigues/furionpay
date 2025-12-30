import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Target, Info, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PixelData {
  id?: string;
  pixelId: string;
  name: string;
  accessToken?: string;
}

interface PixelsSectionProps {
  productId: string;
  userId: string;
}

export function PixelsSection({ productId, userId }: PixelsSectionProps) {
  const queryClient = useQueryClient();
  const [selectedPixels, setSelectedPixels] = useState<string[]>([]);

  // Fetch global pixels from admin_settings
  const { data: globalPixels, isLoading: loadingPixels } = useQuery({
    queryKey: ["global-pixels", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("user_id", userId)
        .eq("key", "meta_pixels")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          return Array.isArray(parsed) ? parsed as PixelData[] : [];
        } catch {
          return [];
        }
      }
      return [];
    },
  });

  // Fetch current product pixel selection
  const { data: productConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ["product-pixel-config", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_checkout_configs")
        .select("selected_pixel_ids")
        .eq("product_id", productId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Set initial selected pixels when data loads
  useEffect(() => {
    if (productConfig?.selected_pixel_ids) {
      setSelectedPixels(productConfig.selected_pixel_ids);
    }
  }, [productConfig]);

  const saveMutation = useMutation({
    mutationFn: async (pixelIds: string[]) => {
      // Check if config exists
      const { data: existingConfig } = await supabase
        .from("product_checkout_configs")
        .select("id")
        .eq("product_id", productId)
        .single();

      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from("product_checkout_configs")
          .update({ 
            selected_pixel_ids: pixelIds,
            updated_at: new Date().toISOString()
          })
          .eq("product_id", productId);
        
        if (error) throw error;
      } else {
        // Create new config with pixel selection
        const { error } = await supabase
          .from("product_checkout_configs")
          .insert({
            product_id: productId,
            user_id: userId,
            selected_pixel_ids: pixelIds,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Pixels salvos com sucesso");
      queryClient.invalidateQueries({ queryKey: ["product-pixel-config", productId] });
    },
    onError: () => {
      toast.error("Erro ao salvar pixels");
    },
  });

  const handleTogglePixel = (pixelId: string) => {
    setSelectedPixels(prev => 
      prev.includes(pixelId)
        ? prev.filter(id => id !== pixelId)
        : [...prev, pixelId]
    );
  };

  const handleSave = () => {
    saveMutation.mutate(selectedPixels);
  };

  const isLoading = loadingPixels || loadingConfig;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasPixels = globalPixels && globalPixels.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Configurar Pixels
        </CardTitle>
        <CardDescription>
          Selecione os pixels que deseja usar neste produto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPixels ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhum pixel configurado</p>
            <p className="text-sm mt-1">
              Configure seus pixels em{" "}
              <a href="/admin/settings" className="text-primary hover:underline">
                Configurações → Integrações
              </a>
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {globalPixels.map((pixel, index) => {
                const pixelIdentifier = pixel.id || pixel.pixelId;
                const isChecked = selectedPixels.includes(pixelIdentifier);
                
                return (
                  <div
                    key={pixelIdentifier}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      isChecked 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleTogglePixel(pixelIdentifier)}
                  >
                    <Checkbox
                      id={`pixel-${index}`}
                      checked={isChecked}
                      onCheckedChange={() => handleTogglePixel(pixelIdentifier)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {pixel.name || `Pixel ${index + 1}`}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {pixel.pixelId}
                      </p>
                    </div>
                    {pixel.accessToken && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        CAPI
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Se nenhum pixel for selecionado, <strong>todos os pixels globais</strong> configurados em Configurações serão usados.
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="w-full gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Pixels
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
