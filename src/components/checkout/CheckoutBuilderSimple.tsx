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
import { compressImage, compressionPresets } from "@/lib/imageCompression";
import { CheckoutPreviewMini } from "./CheckoutPreviewMini";
import { TestimonialsManager } from "./TestimonialsManager";
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
  Video,
  MapPin,
  Phone,
  Calendar,
  FileText,
  Mail,
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
  const [isUploadingPopupImage, setIsUploadingPopupImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupImageInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#16A34A");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  
  // Accordion state - only one section open at a time, all start closed
  const [openSection, setOpenSection] = useState<string | null>(null);
  
  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  };
  
  // Required fields state
  const [requiredFields, setRequiredFields] = useState({
    address: false,
    phone: false,
    birthdate: false,
    cpf: false,
    emailConfirmation: false,
  });

  const [customizations, setCustomizations] = useState({
    showBanner: false,
    showCountdown: false,
    countdownMinutes: 15,
    showVideo: false,
    videoUrl: "",
    showTestimonials: false,
    showDiscountPopup: false,
    discountPopupTitle: "Que tal um desconto para comprar agora?",
    discountPopupMessage: "Você só tem até a meia noite de hoje para aproveitar essa oferta, não perca tempo!",
    discountPopupCta: "Aproveitar oferta",
    discountPopupPercentage: 10,
    discountPopupColor: "#16A34A",
    discountPopupImageUrl: "",
    showWhatsappButton: false,
    whatsappNumber: "",
    showBackRedirect: false,
    backRedirectUrl: "",
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

  // Fetch testimonials for preview
  const { data: testimonials = [] } = useQuery({
    queryKey: ["product-testimonials", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_testimonials")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data;
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
      setRequiredFields({
        address: config.require_address || false,
        phone: config.require_phone || false,
        birthdate: config.require_birthdate || false,
        cpf: config.require_cpf || false,
        emailConfirmation: config.require_email_confirmation || false,
      });
      setCustomizations({
        showBanner: config.show_banners || false,
        showCountdown: config.show_countdown || false,
        countdownMinutes: config.countdown_minutes || 15,
        showVideo: (config as any).show_video || false,
        videoUrl: (config as any).video_url || "",
        showTestimonials: config.show_notifications || false,
        showDiscountPopup: config.show_discount_popup || false,
        discountPopupTitle: config.discount_popup_title || "Que tal um desconto para comprar agora?",
        discountPopupMessage: config.discount_popup_message || "Você só tem até a meia noite de hoje para aproveitar essa oferta, não perca tempo!",
        discountPopupCta: config.discount_popup_cta || "Aproveitar oferta",
        discountPopupPercentage: config.discount_popup_percentage || 10,
        discountPopupColor: config.discount_popup_color || "#16A34A",
        discountPopupImageUrl: config.discount_popup_image_url || "",
        showWhatsappButton: config.show_whatsapp_button || false,
        whatsappNumber: config.whatsapp_number || "",
        showBackRedirect: !!(config as any).back_redirect_url,
        backRedirectUrl: (config as any).back_redirect_url || "",
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

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 10MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file, compressionPresets.banner);
      const fileName = `${userId}/${productId}-banner.webp`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressedBlob, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      // Add cache-busting parameter to force reload
      setBannerImageUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success("Banner comprimido e carregado!");
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle popup image upload
  const handlePopupImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 10MB");
      return;
    }

    setIsUploadingPopupImage(true);
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file, compressionPresets.product);
      const fileName = `${userId}/${productId}-popup.webp`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressedBlob, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      // Add cache-busting parameter to force reload
      const imageUrl = `${publicUrl}?t=${Date.now()}`;
      setCustomizations(p => ({ ...p, discountPopupImageUrl: imageUrl }));
      toast.success("Imagem do popup comprimida e carregada!");
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploadingPopupImage(false);
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
        // Required fields
        require_address: requiredFields.address,
        require_phone: requiredFields.phone,
        require_birthdate: requiredFields.birthdate,
        require_cpf: requiredFields.cpf,
        require_email_confirmation: requiredFields.emailConfirmation,
        // Customizations
        show_banners: customizations.showBanner,
        show_countdown: customizations.showCountdown,
        countdown_minutes: customizations.countdownMinutes,
        show_video: customizations.showVideo,
        video_url: customizations.videoUrl || null,
        show_notifications: customizations.showTestimonials,
        show_whatsapp_button: customizations.showWhatsappButton,
        whatsapp_number: customizations.whatsappNumber || null,
        // Discount popup settings
        show_discount_popup: customizations.showDiscountPopup,
        discount_popup_title: customizations.discountPopupTitle || null,
        discount_popup_message: customizations.discountPopupMessage || null,
        discount_popup_cta: customizations.discountPopupCta || null,
        discount_popup_percentage: customizations.discountPopupPercentage || 10,
        discount_popup_color: customizations.discountPopupColor || "#16A34A",
        discount_popup_image_url: customizations.discountPopupImageUrl || null,
        back_redirect_url: customizations.showBackRedirect ? (customizations.backRedirectUrl || null) : null,
      } as any;

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
  }, [selectedTemplateId, primaryColor, customizations, bannerImageUrl, requiredFields]);

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
                  testimonials={testimonials}
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

        {/* Required Fields */}
        <Card className="border-l-4 border-l-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">Campos obrigatórios no Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Itens Obrigatórios</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRequiredFields(p => ({ ...p, address: !p.address }))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    requiredFields.address
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  Endereço
                </button>
                <button
                  type="button"
                  onClick={() => setRequiredFields(p => ({ ...p, phone: !p.phone }))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    requiredFields.phone
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  )}
                >
                  <Phone className="h-4 w-4" />
                  Telefone
                </button>
                <button
                  type="button"
                  onClick={() => setRequiredFields(p => ({ ...p, birthdate: !p.birthdate }))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    requiredFields.birthdate
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  Data de nascimento
                </button>
                <button
                  type="button"
                  onClick={() => setRequiredFields(p => ({ ...p, cpf: !p.cpf }))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    requiredFields.cpf
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  CPF
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Confirmação de email</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  O usuário estará condicionado a repetir o email informado em um campo específico para sua confirmação.
                </p>
              </div>
              <Switch
                checked={requiredFields.emailConfirmation}
                onCheckedChange={(v) => setRequiredFields(p => ({ ...p, emailConfirmation: v }))}
              />
            </div>
          </CardContent>
        </Card>

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

            {/* Countdown */}
            <Collapsible 
              open={customizations.showCountdown && openSection === "countdown"}
              onOpenChange={() => customizations.showCountdown && toggleSection("countdown")}
            >
              <div className="flex items-center justify-between py-2 border-b">
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 flex-1",
                    customizations.showCountdown ? "cursor-pointer" : "cursor-default opacity-60"
                  )}>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Contador</Label>
                    {customizations.showCountdown && (
                      <ChevronDown className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform",
                        openSection === "countdown" && "rotate-180"
                      )} />
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

            {/* Banner */}
            <Collapsible 
              open={customizations.showBanner && openSection === "banner"}
              onOpenChange={() => customizations.showBanner && toggleSection("banner")}
            >
              <div className="flex items-center justify-between py-2 border-b">
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 flex-1",
                    customizations.showBanner ? "cursor-pointer" : "cursor-default opacity-60"
                  )}>
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Banner</Label>
                    {customizations.showBanner && (
                      <ChevronDown className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform",
                        openSection === "banner" && "rotate-180"
                      )} />
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
                    <div className="space-y-2">
                      <img
                        src={bannerImageUrl}
                        alt="Banner"
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                        >
                          {isUploadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : "Trocar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
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

            {/* Video */}
            <Collapsible 
              open={customizations.showVideo && openSection === "video"}
              onOpenChange={() => customizations.showVideo && toggleSection("video")}
            >
              <div className="flex items-center justify-between py-2 border-b">
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 flex-1",
                    customizations.showVideo ? "cursor-pointer" : "cursor-default opacity-60"
                  )}>
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Vídeo</Label>
                    {customizations.showVideo && (
                      <ChevronDown className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform",
                        openSection === "video" && "rotate-180"
                      )} />
                    )}
                  </div>
                </CollapsibleTrigger>
                <Switch
                  checked={customizations.showVideo}
                  onCheckedChange={(v) => {
                    setCustomizations(p => ({ ...p, showVideo: v }));
                    if (v) setOpenSection("video");
                  }}
                />
              </div>
              <CollapsibleContent>
                <div className="py-2 pl-6 space-y-2">
                  <Label className="text-xs text-muted-foreground">URL do vídeo (YouTube ou URL direta)</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={customizations.videoUrl}
                    onChange={(e) => setCustomizations(p => ({ ...p, videoUrl: e.target.value }))}
                    className="h-9 text-sm"
                  />
                  {customizations.videoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCustomizations(p => ({ ...p, videoUrl: "" }))}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Testimonials */}
            <Collapsible 
              open={customizations.showTestimonials && openSection === "testimonials"}
              onOpenChange={() => customizations.showTestimonials && toggleSection("testimonials")}
            >
              <div className="flex items-center justify-between py-2 border-b">
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 flex-1",
                    customizations.showTestimonials ? "cursor-pointer" : "cursor-default opacity-60"
                  )}>
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Depoimentos</Label>
                    {customizations.showTestimonials && (
                      <ChevronDown className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform",
                        openSection === "testimonials" && "rotate-180"
                      )} />
                    )}
                  </div>
                </CollapsibleTrigger>
                <Switch
                  checked={customizations.showTestimonials}
                  onCheckedChange={(v) => setCustomizations(p => ({ ...p, showTestimonials: v }))}
                />
              </div>
              <CollapsibleContent>
                <div className="py-2 pl-6">
                  <TestimonialsManager productId={productId} userId={userId} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Discount Popup */}
            <Collapsible 
              open={customizations.showDiscountPopup && openSection === "discountPopup"}
              onOpenChange={() => customizations.showDiscountPopup && toggleSection("discountPopup")}
            >
              <div className="flex items-center justify-between py-2 border-b">
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 flex-1",
                    customizations.showDiscountPopup ? "cursor-pointer" : "cursor-default opacity-60"
                  )}>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Popup de Desconto</Label>
                    {customizations.showDiscountPopup && (
                      <ChevronDown className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform",
                        openSection === "discountPopup" && "rotate-180"
                      )} />
                    )}
                  </div>
                </CollapsibleTrigger>
                <Switch
                  checked={customizations.showDiscountPopup}
                  onCheckedChange={(v) => {
                    setCustomizations(p => ({ ...p, showDiscountPopup: v }));
                    if (v) setOpenSection("discountPopup");
                  }}
                />
              </div>
              <CollapsibleContent>
                <div className="py-3 pl-6 space-y-3">
                  {/* Preview */}
                  <div className="p-4 bg-muted/50 rounded-lg border text-center space-y-2">
                    {customizations.discountPopupImageUrl ? (
                      <img 
                        src={customizations.discountPopupImageUrl} 
                        alt="Popup" 
                        className="w-full h-24 object-contain rounded-lg"
                      />
                    ) : (
                      <>
                        <Badge 
                          className="text-sm px-3 py-1 font-bold"
                          style={{ backgroundColor: customizations.discountPopupColor }}
                        >
                          {customizations.discountPopupPercentage}% OFF
                        </Badge>
                        <p className="font-semibold text-sm">{customizations.discountPopupTitle || "Título"}</p>
                        <p className="text-xs text-muted-foreground">{customizations.discountPopupMessage || "Mensagem"}</p>
                        <Button 
                          size="sm" 
                          className="mt-2"
                          style={{ backgroundColor: customizations.discountPopupColor }}
                        >
                          {customizations.discountPopupCta || "CTA"}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* Color picker */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Cor do Popup</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="color"
                        value={customizations.discountPopupColor}
                        onChange={(e) => setCustomizations(p => ({ ...p, discountPopupColor: e.target.value }))}
                        className="h-8 w-12 p-0.5 cursor-pointer"
                      />
                      <Input
                        value={customizations.discountPopupColor}
                        onChange={(e) => setCustomizations(p => ({ ...p, discountPopupColor: e.target.value }))}
                        className="h-8 text-xs flex-1 font-mono"
                        placeholder="#16A34A"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  
                  {/* Popup Image Upload */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Imagem do Popup (opcional)</Label>
                    <input
                      type="file"
                      ref={popupImageInputRef}
                      onChange={handlePopupImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    {customizations.discountPopupImageUrl ? (
                      <div className="relative mt-1">
                        <img
                          src={customizations.discountPopupImageUrl}
                          alt="Popup"
                          className="w-full h-16 object-cover rounded-lg"
                        />
                        <div className="absolute top-1 right-1 flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => popupImageInputRef.current?.click()}
                            disabled={isUploadingPopupImage}
                          >
                            {isUploadingPopupImage ? <Loader2 className="h-3 w-3 animate-spin" /> : "Trocar"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setCustomizations(p => ({ ...p, discountPopupImageUrl: "" }))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-10 flex gap-2 mt-1"
                        onClick={() => popupImageInputRef.current?.click()}
                        disabled={isUploadingPopupImage}
                      >
                        {isUploadingPopupImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span className="text-xs">Upload Imagem</span>
                          </>
                        )}
                      </Button>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">Se preenchido, substitui o badge de desconto</p>
                  </div>
                  
                  {/* Fields */}
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Título</Label>
                      <Input
                        value={customizations.discountPopupTitle}
                        onChange={(e) => setCustomizations(p => ({ ...p, discountPopupTitle: e.target.value }))}
                        className="h-8 text-xs mt-1"
                        placeholder="Que tal um desconto?"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Mensagem</Label>
                        <span className="text-[10px] text-muted-foreground">
                          {customizations.discountPopupMessage?.length || 0}/500
                        </span>
                      </div>
                      <textarea
                        value={customizations.discountPopupMessage}
                        onChange={(e) => setCustomizations(p => ({ ...p, discountPopupMessage: e.target.value }))}
                        className="w-full h-20 mt-1 text-xs p-2 border rounded-md resize-none bg-background"
                        placeholder="Você só tem até..."
                        maxLength={500}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Texto CTA</Label>
                      <Input
                        value={customizations.discountPopupCta}
                        onChange={(e) => setCustomizations(p => ({ ...p, discountPopupCta: e.target.value }))}
                        className="h-8 text-xs mt-1"
                        placeholder="Aproveitar oferta"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Porcentagem de Desconto</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          value={customizations.discountPopupPercentage}
                          onChange={(e) => setCustomizations(p => ({ ...p, discountPopupPercentage: Number(e.target.value) }))}
                          className="h-8 text-xs flex-1"
                          min={1}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* WhatsApp Button */}
            <Collapsible 
              open={customizations.showWhatsappButton && openSection === "whatsapp"}
              onOpenChange={() => customizations.showWhatsappButton && toggleSection("whatsapp")}
            >
              <div className="flex items-center justify-between py-2">
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 flex-1",
                    customizations.showWhatsappButton ? "cursor-pointer" : "cursor-default opacity-60"
                  )}>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Botão WhatsApp</Label>
                    {customizations.showWhatsappButton && (
                      <ChevronDown className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform",
                        openSection === "whatsapp" && "rotate-180"
                      )} />
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

            {/* Back Redirect */}
            <Collapsible 
              open={customizations.showBackRedirect && openSection === "backredirect"}
              onOpenChange={() => customizations.showBackRedirect && toggleSection("backredirect")}
            >
              <div className="flex items-center justify-between py-2">
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 flex-1",
                    customizations.showBackRedirect ? "cursor-pointer" : "cursor-default opacity-60"
                  )}>
                    <Label className="text-sm">Back redirect</Label>
                    {customizations.showBackRedirect && (
                      <ChevronDown className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform",
                        openSection === "backredirect" && "rotate-180"
                      )} />
                    )}
                  </div>
                </CollapsibleTrigger>
                <Switch
                  checked={customizations.showBackRedirect}
                  onCheckedChange={(v) => setCustomizations(p => ({ ...p, showBackRedirect: v }))}
                />
              </div>
              <CollapsibleContent>
                <div className="py-2 pl-6">
                  <p className="text-xs text-muted-foreground mb-2">Link para redirecionar ao sair do checkout</p>
                  <Input
                    value={customizations.backRedirectUrl}
                    onChange={(e) => setCustomizations(p => ({ ...p, backRedirectUrl: e.target.value }))}
                    className="h-7 text-xs"
                    placeholder="https://seusite.com"
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
