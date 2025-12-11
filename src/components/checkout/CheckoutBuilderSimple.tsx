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
import { CheckoutPreviewMini } from "./CheckoutPreviewMini";
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
  Trash2,
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
      setBannerImageUrl(config.header_logo_url || null);
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

      // Add cache-busting parameter to force reload
      setBannerImageUrl(`${publicUrl}?t=${Date.now()}`);
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
      // Get template name to save as template string
      let templateString = "padrao";
      if (selectedTemplate) {
        const name = selectedTemplate.name.toLowerCase();
        templateString = name === "padrão" ? "padrao" : name;
      }

      const configData = {
        product_id: productId,
        user_id: userId,
        template_id: selectedTemplateId,
        template: templateString, // Also save template name for backwards compatibility
        primary_color: primaryColor,
        header_logo_url: bannerImageUrl, // Save banner URL
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
  }, [selectedTemplateId, primaryColor, customizations, bannerImageUrl]);

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
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Preview Panel - Left Side */}
      <div className="flex-1 min-w-0 order-1 xl:order-1">
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
            {/* Dynamic Preview based on selected template */}
            <div 
              className={cn(
                "mx-auto border rounded-lg overflow-hidden transition-all duration-300",
                previewMode === "mobile" ? "max-w-[375px]" : "w-full"
              )}
            >
              <ScrollArea className="h-[600px]">
                <CheckoutPreviewMini
                  templateName={selectedTemplate?.name || "Padrão"}
                  productName={productName}
                  productPrice={productPrice}
                  primaryColor={primaryColor}
                  showCountdown={customizations.showCountdown}
                  countdownMinutes={customizations.countdownMinutes}
                  showTestimonials={customizations.showTestimonials}
                  showBanner={customizations.showBanner}
                  bannerImageUrl={bannerImageUrl}
                  previewMode={previewMode}
                />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config Panel - Right Side */}
      <div className="w-full xl:w-80 shrink-0 order-2 xl:order-2 space-y-4">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Personalizações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Banner */}
            <Collapsible open={customizations.showBanner}>
              <div className="flex items-center justify-between py-2 border-b">
                <CollapsibleTrigger asChild disabled={!customizations.showBanner}>
                  <div className="flex items-center gap-2 cursor-pointer flex-1">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm cursor-pointer">Banner</Label>
                    {customizations.showBanner && (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <Switch
                  checked={customizations.showBanner}
                  onCheckedChange={(v) => setCustomizations(p => ({ ...p, showBanner: v }))}
                />
              </div>
              <CollapsibleContent>
                <div className="py-2 pl-6 space-y-2">
                  {bannerImageUrl ? (
                    <div className="relative">
                      <img
                        src={bannerImageUrl}
                        alt="Banner"
                        className="w-full h-16 object-cover rounded-lg"
                      />
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                        >
                          {isUploadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : "Trocar"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setBannerImageUrl(null)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-12 flex flex-col gap-1"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span className="text-xs">Upload</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Countdown */}
            <Collapsible open={customizations.showCountdown}>
              <div className="flex items-center justify-between py-2 border-b">
                <CollapsibleTrigger asChild disabled={!customizations.showCountdown}>
                  <div className="flex items-center gap-2 cursor-pointer flex-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm cursor-pointer">Cronômetro</Label>
                    {customizations.showCountdown && (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <Switch
                  checked={customizations.showCountdown}
                  onCheckedChange={(v) => setCustomizations(p => ({ ...p, showCountdown: v }))}
                />
              </div>
              <CollapsibleContent>
                <div className="py-2 pl-6">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Minutos:</Label>
                    <Input
                      type="number"
                      value={customizations.countdownMinutes}
                      onChange={(e) => setCustomizations(p => ({ ...p, countdownMinutes: Number(e.target.value) }))}
                      className="h-7 w-16 text-xs"
                      min={1}
                      max={60}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Testimonials */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Depoimentos</Label>
              </div>
              <Switch
                checked={customizations.showTestimonials}
                onCheckedChange={(v) => setCustomizations(p => ({ ...p, showTestimonials: v }))}
              />
            </div>

            {/* Discount Popup */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Popup de Desconto</Label>
              </div>
              <Switch
                checked={customizations.showDiscountPopup}
                onCheckedChange={(v) => setCustomizations(p => ({ ...p, showDiscountPopup: v }))}
              />
            </div>

            {/* WhatsApp Button */}
            <Collapsible open={customizations.showWhatsappButton}>
              <div className="flex items-center justify-between py-2">
                <CollapsibleTrigger asChild disabled={!customizations.showWhatsappButton}>
                  <div className="flex items-center gap-2 cursor-pointer flex-1">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm cursor-pointer">Botão WhatsApp</Label>
                    {customizations.showWhatsappButton && (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <Switch
                  checked={customizations.showWhatsappButton}
                  onCheckedChange={(v) => setCustomizations(p => ({ ...p, showWhatsappButton: v }))}
                />
              </div>
              <CollapsibleContent>
                <div className="py-2 pl-6">
                  <Input
                    value={customizations.whatsappNumber}
                    onChange={(e) => setCustomizations(p => ({ ...p, whatsappNumber: e.target.value }))}
                    className="h-7 text-xs"
                    placeholder="5511999999999"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
