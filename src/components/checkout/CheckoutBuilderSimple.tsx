import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutTemplate,
  Clock,
  Star,
  MessageCircle,
  Monitor,
  Smartphone,
  Upload,
  Check,
  Loader2,
  Image,
  User,
  CreditCard,
  Shield,
  Lock,
  Palette,
  Settings2,
  CheckCircle,
  Percent,
  ChevronDown,
} from "lucide-react";

interface CheckoutBuilderSimpleProps {
  productId: string;
  userId: string;
  productName: string;
  productPrice?: number;
}

interface GlobalTemplate {
  id: string;
  name: string;
  description: string | null;
  template_code: string | null;
  layout_config: Record<string, unknown>;
  is_published: boolean;
  is_default: boolean;
  preview_image_url: string | null;
}

export function CheckoutBuilderSimple({ productId, userId, productName, productPrice = 25 }: CheckoutBuilderSimpleProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#16A34A");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  
  const [customizations, setCustomizations] = useState({
    showBanner: false,
    showCountdown: false,
    countdownMinutes: 15,
    showTestimonials: false,
    showDiscountPopup: false,
    showWhatsappButton: false,
    whatsappNumber: "",
  });

  // Fetch global templates
  const { data: templates } = useQuery({
    queryKey: ["checkout-templates-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_templates")
        .select("*")
        .eq("is_published", true)
        .order("is_default", { ascending: false });
      
      if (error) throw error;
      return data as GlobalTemplate[];
    },
  });

  // Fetch existing config
  const { data: config } = useQuery({
    queryKey: ["checkout-config", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_checkout_configs")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Load config into state
  useEffect(() => {
    if (config) {
      setSelectedTemplateId(config.template_id || null);
      setPrimaryColor(config.primary_color || "#16A34A");
      setCustomizations({
        showBanner: config.show_banners || false,
        showCountdown: config.show_countdown || false,
        countdownMinutes: config.countdown_minutes || 15,
        showTestimonials: config.show_notifications || false,
        showDiscountPopup: false, // TODO: add column
        showWhatsappButton: config.show_whatsapp_button || false,
        whatsappNumber: config.whatsapp_number || "",
      });
    }
  }, [config]);

  // Auto-select default template if none selected
  useEffect(() => {
    if (!selectedTemplateId && templates?.length) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplateId(defaultTemplate.id);
    }
  }, [templates, selectedTemplateId]);

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${productId}-banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setBannerImageUrl(publicUrl);
      toast.success("Banner carregado!");
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save config
  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const configData = {
        product_id: productId,
        user_id: userId,
        template_id: selectedTemplateId,
        primary_color: primaryColor,
        show_banners: customizations.showBanner,
        show_countdown: customizations.showCountdown,
        countdown_minutes: customizations.countdownMinutes,
        show_notifications: customizations.showTestimonials,
        show_whatsapp_button: customizations.showWhatsappButton,
        whatsapp_number: customizations.whatsappNumber || null,
      };

      const { error } = await supabase
        .from("product_checkout_configs")
        .upsert(configData, { onConflict: "product_id" });

      if (error) throw error;
      
      toast.success("Configurações salvas!");
      queryClient.invalidateQueries({ queryKey: ["checkout-config", productId] });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  // Expose save function
  useEffect(() => {
    (window as any).__checkoutSaveConfig = saveConfig;
    return () => {
      delete (window as any).__checkoutSaveConfig;
    };
  }, [selectedTemplateId, primaryColor, customizations]);

  const colors = [
    "#16a34a", "#dc2626", "#ea580c", "#eab308", "#06b6d4", "#3b82f6",
    "#2563eb", "#7c3aed", "#c026d3", "#000000",
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Preview Panel - Left Side */}
      <div className="flex-1 min-w-0 order-2 lg:order-1">
        <Card className="h-full">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{productName}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={previewMode === "desktop" ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewMode("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === "mobile" ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewMode("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {/* Preview Container */}
            <div 
              className={cn(
                "mx-auto border rounded-lg overflow-hidden transition-all duration-300 bg-gray-100",
                previewMode === "mobile" ? "max-w-[375px]" : "w-full"
              )}
            >
              {/* Countdown Preview */}
              {customizations.showCountdown && (
                <div 
                  className="py-3 px-4 text-white text-center flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Clock className="h-4 w-4" />
                  <span className="font-bold">{customizations.countdownMinutes}:00</span>
                  <span className="text-sm">Oferta por tempo limitado</span>
                </div>
              )}

              {/* Banner Preview */}
              {customizations.showBanner && (
                <div 
                  className="border-b cursor-pointer group relative"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {bannerImageUrl ? (
                    <div className="relative">
                      <img 
                        src={bannerImageUrl} 
                        alt="Banner" 
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-6 w-6 text-white" />
                        <span className="text-white text-sm ml-2">Trocar imagem</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white h-32 flex items-center justify-center border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-muted/50 transition-all">
                      {isUploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                          <span className="text-xs text-muted-foreground">
                            Clique para adicionar banner
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />

              {/* Header */}
              <div className="p-4 border-b bg-white">
                <h2 className="text-lg font-semibold">Finalizar Compra</h2>
              </div>

              {/* Product Summary */}
              <div className="p-4 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{productName}</p>
                    <p className="font-bold" style={{ color: primaryColor }}>
                      1 X de {formatPrice(productPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ou {formatPrice(productPrice)} à vista
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="p-4 space-y-4 bg-white">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                    <User className="h-3 w-3 text-white" />
                  </span>
                  Dados do comprador
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome completo</Label>
                    <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-muted-foreground">
                      Digite seu nome
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-muted-foreground">
                      seu@email.com
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <div className="h-10 bg-gray-50 rounded border px-3 flex items-center text-sm text-muted-foreground">
                      (00) 00000-0000
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="p-4 space-y-4 bg-white border-t">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                    <CreditCard className="h-3 w-3 text-white" />
                  </span>
                  Forma de pagamento
                </h3>
                <div 
                  className="p-3 border-2 rounded-lg flex items-center gap-3"
                  style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}10` }}
                >
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-medium">Pix</span>
                </div>
                <Button 
                  className="w-full h-12 font-semibold"
                  style={{ backgroundColor: primaryColor }}
                >
                  Finalizar Compra
                </Button>
              </div>

              {/* Testimonials */}
              {customizations.showTestimonials && (
                <div className="p-4 bg-white border-t">
                  <h4 className="font-medium text-sm mb-3">O que dizem nossos clientes</h4>
                  <div className="space-y-2">
                    {[
                      { name: "Maria S.", text: "Produto excelente!" },
                      { name: "João P.", text: "Recomendo muito!" },
                    ].map((item, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {item.name[0]}
                          </div>
                          <span className="text-xs font-medium">{item.name}</span>
                          <span className="text-[10px] text-yellow-500">⭐⭐⭐⭐⭐</span>
                        </div>
                        <p className="text-xs text-muted-foreground">"{item.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security badges */}
              <div className="p-4 bg-white border-t">
                <div className="flex items-center justify-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs">Pagamento Seguro</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-4 w-4" />
                    <span className="text-xs">Compra Garantida</span>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Pagamento processado com segurança
                </p>
              </div>

              {/* WhatsApp Button */}
              {customizations.showWhatsappButton && (
                <div className="fixed bottom-4 right-4 z-50">
                  <Button className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600">
                    <MessageCircle className="h-6 w-6" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config Panel - Right Side */}
      <div className="w-full lg:w-80 shrink-0 order-1 lg:order-2 space-y-4">
        {/* Template Selection */}
        <Card>
          <Collapsible open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4" />
                    Template
                    {templates && templates.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {templates.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isTemplateOpen && "rotate-180"
                  )} />
                </div>
              </CollapsibleTrigger>
              {!isTemplateOpen && selectedTemplate && (
                <div className="mt-2 p-3 border rounded-lg border-primary bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{selectedTemplate.name}</span>
                    {selectedTemplate.is_default && (
                      <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                    )}
                  </div>
                  {selectedTemplate.description && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.description}</p>
                  )}
                </div>
              )}
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-2 pt-0">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all",
                      selectedTemplateId === template.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50"
                    )}
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setIsTemplateOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedTemplateId === template.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium text-sm">{template.name}</span>
                        {template.is_default && (
                          <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                        )}
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Color */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cor Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    primaryColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setPrimaryColor(color)}
                />
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-8 text-xs font-mono flex-1"
              />
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customizations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Personalizações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Banner</Label>
              </div>
              <Switch
                checked={customizations.showBanner}
                onCheckedChange={(v) => setCustomizations(p => ({ ...p, showBanner: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Cronômetro</Label>
              </div>
              <Switch
                checked={customizations.showCountdown}
                onCheckedChange={(v) => setCustomizations(p => ({ ...p, showCountdown: v }))}
              />
            </div>
            {customizations.showCountdown && (
              <div className="pl-6">
                <Label className="text-xs text-muted-foreground">Minutos</Label>
                <Input
                  type="number"
                  value={customizations.countdownMinutes}
                  onChange={(e) => setCustomizations(p => ({ ...p, countdownMinutes: Number(e.target.value) }))}
                  className="h-8 mt-1"
                  min={1}
                  max={60}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Depoimentos</Label>
              </div>
              <Switch
                checked={customizations.showTestimonials}
                onCheckedChange={(v) => setCustomizations(p => ({ ...p, showTestimonials: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Popup de Desconto</Label>
              </div>
              <Switch
                checked={customizations.showDiscountPopup}
                onCheckedChange={(v) => setCustomizations(p => ({ ...p, showDiscountPopup: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Botão WhatsApp</Label>
              </div>
              <Switch
                checked={customizations.showWhatsappButton}
                onCheckedChange={(v) => setCustomizations(p => ({ ...p, showWhatsappButton: v }))}
              />
            </div>
            {customizations.showWhatsappButton && (
              <div className="pl-6">
                <Label className="text-xs text-muted-foreground">Número do WhatsApp</Label>
                <Input
                  value={customizations.whatsappNumber}
                  onChange={(e) => setCustomizations(p => ({ ...p, whatsappNumber: e.target.value }))}
                  className="h-8 mt-1"
                  placeholder="5511999999999"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
