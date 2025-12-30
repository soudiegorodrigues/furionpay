import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Target, Pencil, Trash2, Loader2, Facebook, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Json } from "@/integrations/supabase/types";

interface PixelEvents {
  purchaseApproved: {
    enabled: boolean;
    pix: boolean;
    boleto: boolean;
    card: boolean;
  };
  pending: {
    enabled: boolean;
    pix: boolean;
    boleto: boolean;
  };
  pageView: boolean;
  initiateCheckout: boolean;
}

interface ProductPixel {
  id: string;
  network: "meta" | "tiktok" | "google";
  pixelId: string;
  name: string;
  domain?: string;
  accessToken?: string;
  conversionLabel?: string;
  events: PixelEvents;
}

interface PixelsSectionProps {
  productId: string;
  userId: string;
}

const defaultEvents: PixelEvents = {
  purchaseApproved: {
    enabled: true,
    pix: true,
    boleto: true,
    card: true,
  },
  pending: {
    enabled: true,
    pix: true,
    boleto: true,
  },
  pageView: true,
  initiateCheckout: true,
};

const emptyPixel: Omit<ProductPixel, "id"> = {
  network: "meta",
  pixelId: "",
  name: "",
  domain: "",
  accessToken: "",
  conversionLabel: "",
  events: defaultEvents,
};

function parseProductPixels(data: Json | null | undefined): ProductPixel[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as ProductPixel[];
}

export function PixelsSection({ productId, userId }: PixelsSectionProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState<ProductPixel | null>(null);
  const [formData, setFormData] = useState<Omit<ProductPixel, "id">>(emptyPixel);

  const { data: productConfig, isLoading } = useQuery({
    queryKey: ["product-pixel-config", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_checkout_configs")
        .select("product_pixels")
        .eq("product_id", productId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const pixels: ProductPixel[] = parseProductPixels(productConfig?.product_pixels);

  const saveMutation = useMutation({
    mutationFn: async (newPixels: ProductPixel[]) => {
      const { data: existingConfig } = await supabase
        .from("product_checkout_configs")
        .select("id")
        .eq("product_id", productId)
        .single();

      if (existingConfig) {
        const { error } = await supabase
          .from("product_checkout_configs")
          .update({ 
            product_pixels: newPixels as unknown as Json,
            updated_at: new Date().toISOString()
          })
          .eq("product_id", productId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("product_checkout_configs")
          .insert({
            product_id: productId,
            user_id: userId,
            product_pixels: newPixels as unknown as Json,
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

  const handleOpenAdd = () => {
    setEditingPixel(null);
    setFormData(emptyPixel);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (pixel: ProductPixel) => {
    setEditingPixel(pixel);
    setFormData({
      network: pixel.network,
      pixelId: pixel.pixelId,
      name: pixel.name,
      domain: pixel.domain || "",
      accessToken: pixel.accessToken || "",
      conversionLabel: pixel.conversionLabel || "",
      events: pixel.events,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (pixelId: string) => {
    const newPixels = pixels.filter(p => p.id !== pixelId);
    saveMutation.mutate(newPixels);
  };

  const handleSavePixel = () => {
    if (!formData.pixelId.trim()) {
      toast.error("ID do Pixel é obrigatório");
      return;
    }

    let newPixels: ProductPixel[];
    
    if (editingPixel) {
      newPixels = pixels.map(p => 
        p.id === editingPixel.id 
          ? { ...formData, id: editingPixel.id }
          : p
      );
    } else {
      const newPixel: ProductPixel = {
        ...formData,
        id: crypto.randomUUID(),
      };
      newPixels = [...pixels, newPixel];
    }

    saveMutation.mutate(newPixels);
    setIsDialogOpen(false);
  };

  const updateEvents = (path: string, value: boolean) => {
    setFormData(prev => {
      const events = { ...prev.events };
      const parts = path.split(".");
      
      if (parts.length === 1) {
        (events as any)[parts[0]] = value;
      } else if (parts.length === 2) {
        (events as any)[parts[0]] = { ...(events as any)[parts[0]], [parts[1]]: value };
      }
      
      return { ...prev, events };
    });
  };

  const getNetworkIcon = (network: string) => {
    switch (network) {
      case "meta":
        return <Facebook className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getNetworkLabel = (network: string) => {
    switch (network) {
      case "meta":
        return "Meta / Facebook";
      case "tiktok":
        return "TikTok";
      case "google":
        return "Google";
      default:
        return network;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Pixels do Produto
              </CardTitle>
              <CardDescription>
                Configure os pixels específicos para este produto
              </CardDescription>
            </div>
            <Button onClick={handleOpenAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Pixel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pixels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhum pixel configurado</p>
              <p className="text-sm mt-1">
                Adicione pixels para rastrear conversões deste produto
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pixels.map((pixel) => (
                <div
                  key={pixel.id}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                    {getNetworkIcon(pixel.network)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {pixel.name || `Pixel ${pixel.pixelId}`}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono">{pixel.pixelId}</span>
                      <span>•</span>
                      <span>{getNetworkLabel(pixel.network)}</span>
                      {pixel.accessToken && (
                        <>
                          <span>•</span>
                          <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                            CAPI
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(pixel)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pixel.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingPixel ? "Editar Pixel" : "Adicionar Pixel"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Coluna Esquerda - Dados do Pixel */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rede Social</Label>
                <Select
                  value={formData.network}
                  onValueChange={(v) => {
                    const network = v as "meta" | "tiktok" | "google";
                    setFormData(prev => ({
                      ...prev,
                      network,
                      domain: network === "google" ? "" : prev.domain,
                      accessToken: network === "google" ? "" : prev.accessToken,
                      conversionLabel: network !== "google" ? "" : prev.conversionLabel,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta">Meta / Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="google">Google Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{formData.network === "google" ? "Conversion ID *" : "ID do Pixel *"}</Label>
                <Input
                  value={formData.pixelId}
                  onChange={(e) => setFormData(prev => ({ ...prev, pixelId: e.target.value }))}
                  placeholder={formData.network === "google" ? "AW-1234567890" : "1234567890"}
                />
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Meu Pixel Principal"
                />
              </div>

              {/* Google Ads: Conversion Label */}
              {formData.network === "google" && (
                <div className="space-y-2">
                  <Label>Conversion Label *</Label>
                  <Input
                    value={formData.conversionLabel || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, conversionLabel: e.target.value }))}
                    placeholder="AbCdEfGhIjK"
                  />
                  <p className="text-xs text-muted-foreground">
                    Label de conversão do Google Ads
                  </p>
                </div>
              )}

              {/* Meta/TikTok: Domínio */}
              {(formData.network === "meta" || formData.network === "tiktok") && (
                <div className="space-y-2">
                  <Label>Domínio</Label>
                  <Input
                    value={formData.domain || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="meusite.com"
                  />
                </div>
              )}

              {/* Meta/TikTok: Token de Acesso */}
              {(formData.network === "meta" || formData.network === "tiktok") && (
                <div className="space-y-2">
                  <Label>
                    {formData.network === "meta" ? "Token da API de Conversão" : "Token de Acesso"}
                  </Label>
                  <Input
                    value={formData.accessToken || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, accessToken: e.target.value }))}
                    placeholder={formData.network === "meta" ? "EAAG..." : "Token..."}
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.network === "meta"
                      ? "Token para envio de eventos via Conversions API (server-side)"
                      : "Token para TikTok Events API"}
                  </p>
                </div>
              )}
            </div>

            {/* Coluna Direita - Configuração de Eventos */}
            <div className="space-y-4">
              <h4 className="font-medium">Configuração de Eventos</h4>
              
              {/* Page View */}
              <div className="flex items-center justify-between">
                <Label className="font-normal">PageView</Label>
                <Switch
                  checked={formData.events.pageView}
                  onCheckedChange={(v) => updateEvents("pageView", v)}
                />
              </div>

              {/* Initiate Checkout */}
              <div className="flex items-center justify-between">
                <Label className="font-normal">InitiateCheckout</Label>
                <Switch
                  checked={formData.events.initiateCheckout}
                  onCheckedChange={(v) => updateEvents("initiateCheckout", v)}
                />
              </div>

              {/* Purchase Approved */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Compra Aprovada (Purchase)</Label>
                  <Switch
                    checked={formData.events.purchaseApproved.enabled}
                    onCheckedChange={(v) => updateEvents("purchaseApproved.enabled", v)}
                  />
                </div>
                
                {formData.events.purchaseApproved.enabled && (
                  <div className="pl-4 space-y-2 border-l-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <Label className="font-normal text-sm">Ao comprar com Pix</Label>
                      <Switch
                        checked={formData.events.purchaseApproved.pix}
                        onCheckedChange={(v) => updateEvents("purchaseApproved.pix", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal text-sm">Ao comprar com Boleto</Label>
                      <Switch
                        checked={formData.events.purchaseApproved.boleto}
                        onCheckedChange={(v) => updateEvents("purchaseApproved.boleto", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal text-sm">Ao comprar com Cartão</Label>
                      <Switch
                        checked={formData.events.purchaseApproved.card}
                        onCheckedChange={(v) => updateEvents("purchaseApproved.card", v)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pending */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Pagamento Pendente</Label>
                  <Switch
                    checked={formData.events.pending.enabled}
                    onCheckedChange={(v) => updateEvents("pending.enabled", v)}
                  />
                </div>
                
                {formData.events.pending.enabled && (
                  <div className="pl-4 space-y-2 border-l-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <Label className="font-normal text-sm">Pagamento Pix gerado</Label>
                      <Switch
                        checked={formData.events.pending.pix}
                        onCheckedChange={(v) => updateEvents("pending.pix", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal text-sm">Boleto gerado</Label>
                      <Switch
                        checked={formData.events.pending.boleto}
                        onCheckedChange={(v) => updateEvents("pending.boleto", v)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePixel} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPixel ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
