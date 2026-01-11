import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage, compressionPresets } from "@/lib/imageCompression";
import { CheckoutPreviewMini } from "./CheckoutPreviewMini";
import { TestimonialsManager } from "./TestimonialsManager";
import { BannersManager } from "./BannersManager";
import { Section } from "@/components/product-edit";
import {
  LayoutTemplate,
  LayoutGrid,
  Clock,
  Star,
  MessageCircle,
  Monitor,
  Smartphone,
  Upload,
  Check,
  Loader2,
  Image,
  Palette,
  Settings2,
  Percent,
  ChevronDown,
  Trash2,
  Video,
  MapPin,
  Phone,
  Calendar,
  FileText,
  Mail,
  ArrowLeft,
  Sparkles,
  FormInput,
  ExternalLink,
  Eye,
  Zap,
  Link,
  X,
  Play,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Fallback template models if database is empty
const fallbackTemplateModels = [
  { id: "fallback-padrao", name: "Padrão", template_code: "padrao", is_default: true },
  { id: "fallback-clean", name: "Clean", template_code: "afilia", is_default: false },
  { id: "fallback-dark", name: "Dark", template_code: "vega", is_default: false },
  { id: "fallback-minimal", name: "Minimal", template_code: "multistep", is_default: false },
];

interface CheckoutBuilderSimpleProps {
  productId: string;
  userId: string;
  productName: string;
  productPrice?: number;
  onNavigate?: (section: Section) => void;
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

export function CheckoutBuilderSimple({ productId, userId, productName, productPrice = 25, onNavigate }: CheckoutBuilderSimpleProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingPopupImage, setIsUploadingPopupImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
  const popupImageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPosterInputRef = useRef<HTMLInputElement>(null);
  const videoPlayOverlayInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingVideoPoster, setIsUploadingVideoPoster] = useState(false);
  const [isUploadingPlayOverlay, setIsUploadingPlayOverlay] = useState(false);
  const [configTab, setConfigTab] = useState("templates");

  // States
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>("modelo-padrao");
  const [primaryColor, setPrimaryColor] = useState("#16A34A");
  const [backgroundColor, setBackgroundColor] = useState("#f3f4f6");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  
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
    countdownColor: "#dc2626",
    countdownText: "🔥 OFERTA EXPIRA EM:",
    showVideo: false,
    videoUrl: "",
    videoType: "url" as "url" | "upload",
    videoPosterUrl: "",
    videoPlayOverlayUrl: "",
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
    deliveryDescription: "Acesso imediato",
  });

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<string | null>(null);

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
    staleTime: 60000, // 1 minute - templates rarely change
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
    staleTime: 30000, // 30 seconds
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
    staleTime: 30000, // 30 seconds
  });

  // Fetch banners for preview
  const { data: banners = [] } = useQuery({
    queryKey: ["checkout-banners-preview", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_banners")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Fetch order bumps for preview
  const { data: orderBumps = [] } = useQuery({
    queryKey: ["order-bumps-preview", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_order_bumps")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("position", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Fetch first offer for preview link
  const { data: firstOffer } = useQuery({
    queryKey: ["product-first-offer", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("offer_code")
        .eq("product_id", productId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Load config into state
  useEffect(() => {
    if (config) {
      setSelectedTemplateId(config.template_id || null);
      setPrimaryColor(config.primary_color || "#16A34A");
      setBackgroundColor(config.background_color || "#f3f4f6");
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
        countdownColor: (config as any).countdown_color || "#dc2626",
        countdownText: (config as any).countdown_text || "🔥 OFERTA EXPIRA EM:",
        showVideo: (config as any).show_video || false,
        videoUrl: (config as any).video_url || "",
        videoType: ((config as any).video_url?.includes('checkout-videos') ? 'upload' : 'url') as "url" | "upload",
        videoPosterUrl: (config as any).video_poster_url || "",
        videoPlayOverlayUrl: (config as any).video_play_overlay_url || "",
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
        deliveryDescription: (config as any).delivery_description || "Acesso imediato",
      });
      
      // Mapear template salvo para o modelo correto
      if (config.template) {
        const templateMap: Record<string, string> = {
          "padrao": "modelo-padrao",
          "padrão": "modelo-padrao",
          "afilia": "modelo-clean",
          "vega": "modelo-dark",
          "multistep": "modelo-minimal",
        };
        const modelId = templateMap[config.template.toLowerCase()] || "modelo-padrao";
        setSelectedModelId(modelId);
      }
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

      setBannerImageUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success("Banner carregado!");
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

      const imageUrl = `${publicUrl}?t=${Date.now()}`;
      setCustomizations(p => ({ ...p, discountPopupImageUrl: imageUrl }));
      toast.success("Imagem do popup carregada!");
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploadingPopupImage(false);
    }
  };

  // Handle video upload
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use MP4, WebM ou MOV");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Vídeo deve ter no máximo 100MB");
      return;
    }

    setIsUploadingVideo(true);
    try {
      const extension = file.name.split('.').pop();
      const fileName = `${userId}/${productId}-video-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("checkout-videos")
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("checkout-videos")
        .getPublicUrl(fileName);

      setCustomizations(p => ({ ...p, videoUrl: publicUrl, videoType: 'upload' }));
      toast.success("Vídeo enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar vídeo:", error);
      toast.error("Erro ao enviar vídeo");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Handle video poster upload
  const handleVideoPosterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingVideoPoster(true);
    try {
      const compressedBlob = await compressImage(file, compressionPresets.banner);
      const fileName = `${userId}/${productId}-video-poster.webp`;

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

      const imageUrl = `${publicUrl}?t=${Date.now()}`;
      setCustomizations(p => ({ ...p, videoPosterUrl: imageUrl }));
      toast.success("Capa do vídeo carregada!");
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploadingVideoPoster(false);
    }
  };

  // Handle video play overlay upload (custom play button image)
  const handlePlayOverlayUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/webp', 'image/svg+xml', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, WebP, SVG ou JPEG");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploadingPlayOverlay(true);
    try {
      let uploadBlob: Blob = file;
      let contentType = file.type;
      let extension = file.name.split('.').pop() || 'png';

      // Compress if not SVG
      if (file.type !== 'image/svg+xml') {
        uploadBlob = await compressImage(file, compressionPresets.product);
        contentType = 'image/webp';
        extension = 'webp';
      }

      const fileName = `${userId}/${productId}-play-overlay.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, uploadBlob, { 
          upsert: true,
          contentType
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      const imageUrl = `${publicUrl}?t=${Date.now()}`;
      setCustomizations(p => ({ ...p, videoPlayOverlayUrl: imageUrl }));
      toast.success("Ícone de play carregado!");
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploadingPlayOverlay(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      // Use template from database only
      const allTemplates = templates || [];
      const selectedTemplate = allTemplates.find(t => t.id === selectedModelId);
      let templateString = selectedTemplate?.template_code || "padrao";
      // Normalizar para o formato do banco de dados
      if (templateString === "padrão") templateString = "padrao";

      const configData = {
        product_id: productId,
        user_id: userId,
        template_id: selectedTemplateId,
        template: templateString,
        primary_color: primaryColor,
        background_color: backgroundColor,
        header_logo_url: bannerImageUrl,
        require_address: requiredFields.address,
        require_phone: requiredFields.phone,
        require_birthdate: requiredFields.birthdate,
        require_cpf: requiredFields.cpf,
        require_email_confirmation: requiredFields.emailConfirmation,
        show_banners: customizations.showBanner,
        show_countdown: customizations.showCountdown,
        countdown_minutes: customizations.countdownMinutes,
        countdown_color: customizations.countdownColor || "#dc2626",
        countdown_text: customizations.countdownText || "🔥 OFERTA EXPIRA EM:",
        show_video: customizations.showVideo,
        video_url: customizations.videoUrl || null,
        video_poster_url: customizations.videoPosterUrl || null,
        video_play_overlay_url: customizations.videoPlayOverlayUrl || null,
        show_notifications: customizations.showTestimonials,
        show_whatsapp_button: customizations.showWhatsappButton,
        whatsapp_number: customizations.whatsappNumber || null,
        show_discount_popup: customizations.showDiscountPopup,
        discount_popup_title: customizations.discountPopupTitle || null,
        discount_popup_message: customizations.discountPopupMessage || null,
        discount_popup_cta: customizations.discountPopupCta || null,
        discount_popup_percentage: customizations.discountPopupPercentage || 10,
        discount_popup_color: customizations.discountPopupColor || "#16A34A",
        discount_popup_image_url: customizations.discountPopupImageUrl || null,
        back_redirect_url: customizations.showBackRedirect ? (customizations.backRedirectUrl || null) : null,
        delivery_description: customizations.deliveryDescription || "Acesso imediato",
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
  }, [selectedTemplateId, primaryColor, backgroundColor, customizations, bannerImageUrl, requiredFields, selectedModelId]);

  const colors = [
    "#16a34a", "#dc2626", "#ea580c", "#eab308", "#06b6d4", "#3b82f6",
    "#2563eb", "#7c3aed", "#c026d3", "#000000",
  ];

  const backgroundColors = [
    "#f3f4f6", "#ffffff", "#f8fafc", "#fafafa", "#f5f5f5",
    "#f0fdf4", "#fef3c7", "#fee2e2", "#e0f2fe", "#f3e8ff",
  ];

  return (
    <div className="space-y-4">
      {/* Config Panel - Top */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={configTab} onValueChange={setConfigTab}>
                <TabsList className="w-full grid grid-cols-4 mb-4">
                  <TabsTrigger value="templates" className="gap-1 text-xs">
                    <LayoutGrid className="h-3 w-3" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="aparencia" className="gap-1 text-xs">
                    <Palette className="h-3 w-3" />
                    Aparência
                  </TabsTrigger>
                  <TabsTrigger value="campos" className="gap-1 text-xs">
                    <FormInput className="h-3 w-3" />
                    Campos
                  </TabsTrigger>
                  <TabsTrigger value="recursos" className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" />
                    Recursos
                  </TabsTrigger>
                </TabsList>

                {/* TAB: Templates */}
                <TabsContent value="templates" className="space-y-4 mt-0">
                  {/* Template Models Gallery */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Modelos de Template
                    </Label>
                  {(!templates || templates.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum template disponível</p>
                      <p className="text-xs">Ative templates no painel Admin</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {templates.map((model) => (
                        <div
                          key={model.id}
                          className={cn(
                            "relative rounded-lg border-2 cursor-pointer overflow-hidden transition-all",
                            selectedModelId === model.id 
                              ? "border-primary ring-2 ring-primary/20" 
                              : "border-muted hover:border-muted-foreground/50"
                          )}
                          onClick={() => setSelectedModelId(model.id)}
                        >
                          {/* Preview Miniatura */}
                          <div className="w-full h-24 bg-muted overflow-hidden relative">
                            <div 
                              className="absolute inset-0 origin-top-left pointer-events-none"
                              style={{ transform: 'scale(0.12)', width: '833%', height: '833%' }}
                            >
                              <CheckoutPreviewMini
                                templateName={model.template_code || "padrao"}
                                productName="Produto"
                                productPrice={97}
                                primaryColor={primaryColor}
                                previewMode="desktop"
                              />
                            </div>
                          </div>
                          
                          {/* Label */}
                          <div className="p-2 bg-background flex items-center justify-between">
                            <span className="text-xs font-medium">{model.name}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewingTemplate(model.template_code || "padrao");
                                  setPreviewDialogOpen(true);
                                }}
                                title="Ver preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {model.is_default && (
                                <Badge className="text-[10px] h-4 px-1">Padrão</Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Selected indicator */}
                          {selectedModelId === model.id && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>

                  {/* Template Base Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4" />
                      Template Base
                    </Label>
                    <div className="space-y-2">
                      {templates?.map((template) => (
                        <div
                          key={template.id}
                          className={cn(
                            "p-2 border rounded-lg cursor-pointer transition-all",
                            selectedTemplateId === template.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          )}
                          onClick={() => setSelectedTemplateId(template.id)}
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
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: Aparência */}
                <TabsContent value="aparencia" className="space-y-4 mt-0">
                  {/* Color */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Cor Principal
                    </Label>
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
                    <div className="flex gap-2">
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
                  </div>

                  {/* Background Color */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Cor de Fundo
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {backgroundColors.map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-8 h-8 rounded-lg transition-all border",
                            backgroundColor === color ? "ring-2 ring-offset-2 ring-primary" : "border-muted-foreground/20"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setBackgroundColor(color)}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-8 text-xs font-mono flex-1"
                      />
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Banner */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Banners
                      </Label>
                      <Switch
                        checked={customizations.showBanner}
                        onCheckedChange={(v) => setCustomizations(p => ({ ...p, showBanner: v }))}
                      />
                    </div>
                    <BannersManager
                      productId={productId}
                      userId={userId}
                      showBanners={customizations.showBanner}
                      onShowBannersChange={(v) => setCustomizations(p => ({ ...p, showBanner: v }))}
                    />
                  </div>

                  {/* Delivery Description */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Descrição de entrega
                    </Label>
                    <Input
                      value={customizations.deliveryDescription}
                      onChange={(e) => setCustomizations(p => ({ ...p, deliveryDescription: e.target.value }))}
                      placeholder="Ex: Acesso imediato, Entrega digital"
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Texto exibido abaixo do nome do produto no resumo
                    </p>
                  </div>
                </TabsContent>

                {/* TAB: Campos */}
                <TabsContent value="campos" className="space-y-3 mt-0">
                  <Label className="text-sm font-medium">Campos obrigatórios no checkout</Label>
                  
                  {/* Required Fields as Cards */}
                  <div className="space-y-1.5">
                    <div className={cn(
                      "flex items-center justify-between p-2 border rounded-lg transition-all",
                      requiredFields.address && "border-primary bg-primary/5"
                    )}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Endereço</span>
                      </div>
                      <Switch
                        checked={requiredFields.address}
                        onCheckedChange={(v) => setRequiredFields(p => ({ ...p, address: v }))}
                      />
                    </div>

                    <div className={cn(
                      "flex items-center justify-between p-2 border rounded-lg transition-all",
                      requiredFields.phone && "border-primary bg-primary/5"
                    )}>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Telefone</span>
                      </div>
                      <Switch
                        checked={requiredFields.phone}
                        onCheckedChange={(v) => setRequiredFields(p => ({ ...p, phone: v }))}
                      />
                    </div>

                    <div className={cn(
                      "flex items-center justify-between p-2 border rounded-lg transition-all",
                      requiredFields.birthdate && "border-primary bg-primary/5"
                    )}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Data de nascimento</span>
                      </div>
                      <Switch
                        checked={requiredFields.birthdate}
                        onCheckedChange={(v) => setRequiredFields(p => ({ ...p, birthdate: v }))}
                      />
                    </div>

                    <div className={cn(
                      "flex items-center justify-between p-2 border rounded-lg transition-all",
                      requiredFields.cpf && "border-primary bg-primary/5"
                    )}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">CPF</span>
                      </div>
                      <Switch
                        checked={requiredFields.cpf}
                        onCheckedChange={(v) => setRequiredFields(p => ({ ...p, cpf: v }))}
                      />
                    </div>

                    <div className={cn(
                      "flex items-center justify-between p-2 border rounded-lg transition-all",
                      requiredFields.emailConfirmation && "border-primary bg-primary/5"
                    )}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Confirmação de email</span>
                      </div>
                      <Switch
                        checked={requiredFields.emailConfirmation}
                        onCheckedChange={(v) => setRequiredFields(p => ({ ...p, emailConfirmation: v }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: Recursos */}
                <TabsContent value="recursos" className="space-y-2 mt-0">
                  {/* Countdown */}
                  <div className={cn(
                    "p-2 border rounded-lg transition-all",
                    customizations.showCountdown && "border-primary bg-primary/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Contador</span>
                      </div>
                      <Switch
                        checked={customizations.showCountdown}
                        onCheckedChange={(v) => setCustomizations(p => ({ ...p, showCountdown: v }))}
                      />
                    </div>
                    {customizations.showCountdown && (
                      <div className="space-y-3 mt-2 pt-2 border-t">
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
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Texto do contador:</Label>
                          <Input
                            value={customizations.countdownText}
                            onChange={(e) => setCustomizations(p => ({ ...p, countdownText: e.target.value }))}
                            placeholder="🔥 OFERTA EXPIRA EM:"
                            className="h-7 text-xs"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Cor:</Label>
                          <Input
                            type="color"
                            value={customizations.countdownColor}
                            onChange={(e) => setCustomizations(p => ({ ...p, countdownColor: e.target.value }))}
                            className="h-7 w-10 p-0 cursor-pointer border-0"
                          />
                          <span className="text-xs text-muted-foreground">{customizations.countdownColor}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video */}
                  <div className={cn(
                    "p-2 border rounded-lg transition-all",
                    customizations.showVideo && "border-primary bg-primary/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Vídeo</span>
                      </div>
                      <Switch
                        checked={customizations.showVideo}
                        onCheckedChange={(v) => setCustomizations(p => ({ ...p, showVideo: v }))}
                      />
                    </div>
                    {customizations.showVideo && (
                      <div className="mt-2 pt-2 border-t space-y-3">
                        {/* Tabs para escolher entre URL e Upload */}
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant={customizations.videoType === 'url' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => setCustomizations(p => ({ ...p, videoType: 'url' }))}
                          >
                            <Link className="h-3 w-3 mr-1" />
                            URL
                          </Button>
                          <Button
                            type="button"
                            variant={customizations.videoType === 'upload' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => setCustomizations(p => ({ ...p, videoType: 'upload' }))}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </Button>
                        </div>

                        {/* Input de URL */}
                        {customizations.videoType === 'url' && (
                          <Input
                            placeholder="https://youtube.com/watch?v=..."
                            value={customizations.videoUrl}
                            onChange={(e) => setCustomizations(p => ({ ...p, videoUrl: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        )}

                        {/* Upload de vídeo */}
                        {customizations.videoType === 'upload' && (
                          <div className="space-y-2">
                            <input
                              ref={videoInputRef}
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              onChange={handleVideoUpload}
                              className="hidden"
                            />
                            
                            {customizations.videoUrl && customizations.videoUrl.includes('checkout-videos') ? (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                                <Video className="h-4 w-4 text-green-500" />
                                <span className="text-xs truncate flex-1">Vídeo enviado</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setCustomizations(p => ({ ...p, videoUrl: '' }))}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs"
                                onClick={() => videoInputRef.current?.click()}
                                disabled={isUploadingVideo}
                              >
                                {isUploadingVideo ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                {isUploadingVideo ? "Enviando..." : "Enviar vídeo (máx. 100MB)"}
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Ícone de Play Personalizado */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label className="text-xs font-medium flex items-center gap-2">
                            <Play className="h-3 w-3" />
                            Ícone de Play (opcional)
                          </Label>
                          <input
                            ref={videoPlayOverlayInputRef}
                            type="file"
                            accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif"
                            onChange={handlePlayOverlayUpload}
                            className="hidden"
                          />
                          
                          {customizations.videoPlayOverlayUrl ? (
                            <div className="relative">
                              <div className="w-full h-20 bg-gray-900 rounded-lg flex items-center justify-center">
                                <img
                                  src={customizations.videoPlayOverlayUrl}
                                  alt="Ícone de play"
                                  className="max-w-[60%] max-h-[80%] object-contain"
                                />
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={() => setCustomizations(p => ({ ...p, videoPlayOverlayUrl: "" }))}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => videoPlayOverlayInputRef.current?.click()}
                              disabled={isUploadingPlayOverlay}
                            >
                              {isUploadingPlayOverlay ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                              ) : (
                                <Upload className="h-3 w-3 mr-2" />
                              )}
                              {isUploadingPlayOverlay ? "Enviando..." : "Enviar ícone de play"}
                            </Button>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            Imagem centralizada sobre o vídeo (substitui o play padrão)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Testimonials */}
                  <div className={cn(
                    "p-2 border rounded-lg transition-all",
                    customizations.showTestimonials && "border-primary bg-primary/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Depoimentos</span>
                      </div>
                      <Switch
                        checked={customizations.showTestimonials}
                        onCheckedChange={(v) => setCustomizations(p => ({ ...p, showTestimonials: v }))}
                      />
                    </div>
                    {customizations.showTestimonials && (
                      <div className="mt-2 pt-2 border-t">
                        <TestimonialsManager productId={productId} userId={userId} />
                      </div>
                    )}
                  </div>

                  {/* Discount Popup */}
                  <div className={cn(
                    "p-2 border rounded-lg transition-all",
                    customizations.showDiscountPopup && "border-primary bg-primary/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Popup de Desconto</span>
                      </div>
                      <Switch
                        checked={customizations.showDiscountPopup}
                        onCheckedChange={(v) => setCustomizations(p => ({ ...p, showDiscountPopup: v }))}
                      />
                    </div>
                    {customizations.showDiscountPopup && (
                      <div className="mt-2 pt-2 border-t space-y-2">
                        <input
                          type="file"
                          ref={popupImageInputRef}
                          onChange={handlePopupImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={customizations.discountPopupColor}
                            onChange={(e) => setCustomizations(p => ({ ...p, discountPopupColor: e.target.value }))}
                            className="h-8 w-12 p-0.5 cursor-pointer"
                          />
                          <Input
                            type="number"
                            value={customizations.discountPopupPercentage}
                            onChange={(e) => setCustomizations(p => ({ ...p, discountPopupPercentage: Number(e.target.value) }))}
                            className="h-8 w-16 text-xs"
                            min={1}
                            max={100}
                          />
                          <span className="text-xs self-center">%</span>
                        </div>
                        <Input
                          value={customizations.discountPopupTitle}
                          onChange={(e) => setCustomizations(p => ({ ...p, discountPopupTitle: e.target.value }))}
                          className="h-8 text-xs"
                          placeholder="Título"
                        />
                        <Input
                          value={customizations.discountPopupCta}
                          onChange={(e) => setCustomizations(p => ({ ...p, discountPopupCta: e.target.value }))}
                          className="h-8 text-xs"
                          placeholder="Texto do botão"
                        />
                        {customizations.discountPopupImageUrl ? (
                          <div className="relative">
                            <img
                              src={customizations.discountPopupImageUrl}
                              alt="Popup"
                              className="w-full h-16 object-cover rounded-lg"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => setCustomizations(p => ({ ...p, discountPopupImageUrl: "" }))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => popupImageInputRef.current?.click()}
                            disabled={isUploadingPopupImage}
                          >
                            {isUploadingPopupImage ? <Loader2 className="h-3 w-3 animate-spin" /> : "Upload Imagem"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div className={cn(
                    "p-2 border rounded-lg transition-all",
                    customizations.showWhatsappButton && "border-primary bg-primary/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Botão WhatsApp</span>
                      </div>
                      <Switch
                        checked={customizations.showWhatsappButton}
                        onCheckedChange={(v) => setCustomizations(p => ({ ...p, showWhatsappButton: v }))}
                      />
                    </div>
                    {customizations.showWhatsappButton && (
                      <div className="mt-2 pt-2 border-t">
                        <Input
                          value={customizations.whatsappNumber}
                          onChange={(e) => setCustomizations(p => ({ ...p, whatsappNumber: e.target.value }))}
                          className="h-8 text-xs"
                          placeholder="5511999999999"
                        />
                      </div>
                    )}
                  </div>

                  {/* Back Redirect */}
                  <div className={cn(
                    "p-2 border rounded-lg transition-all",
                    customizations.showBackRedirect && "border-primary bg-primary/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Back redirect</span>
                      </div>
                      <Switch
                        checked={customizations.showBackRedirect}
                        onCheckedChange={(v) => setCustomizations(p => ({ ...p, showBackRedirect: v }))}
                      />
                    </div>
                    {customizations.showBackRedirect && (
                      <div className="mt-2 pt-2 border-t">
                        <Input
                          value={customizations.backRedirectUrl}
                          onChange={(e) => setCustomizations(p => ({ ...p, backRedirectUrl: e.target.value }))}
                          className="h-8 text-xs"
                          placeholder="https://seusite.com"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

      {/* Preview Panel - Bottom */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm font-medium">Preview do Checkout</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant={previewMode === "desktop" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewMode("desktop")}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={previewMode === "mobile" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewMode("mobile")}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={!firstOffer?.offer_code}
              onClick={() => {
                if (firstOffer?.offer_code) {
                  window.open(`/${firstOffer.offer_code}`, '_blank');
                }
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Visualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div 
            className={cn(
              "mx-auto border rounded-lg overflow-hidden transition-all duration-300 bg-muted/30",
              previewMode === "mobile" ? "max-w-[375px]" : "w-full"
            )}
          >
            <ScrollArea className="h-[600px]">
              <CheckoutPreviewMini
                templateName={selectedTemplate?.name || "Padrão"}
                productName={productName}
                productPrice={productPrice}
                primaryColor={primaryColor}
                backgroundColor={backgroundColor}
                showCountdown={customizations.showCountdown}
                countdownMinutes={customizations.countdownMinutes}
                countdownColor={customizations.countdownColor}
                countdownText={customizations.countdownText}
                showTestimonials={customizations.showTestimonials}
                showBanner={customizations.showBanner}
                bannerImageUrl={bannerImageUrl}
                previewMode={previewMode}
                testimonials={testimonials}
                deliveryDescription={customizations.deliveryDescription}
                requiredFields={requiredFields}
                showVideo={customizations.showVideo}
                videoUrl={customizations.videoUrl}
                videoPosterUrl={customizations.videoPosterUrl}
                videoPlayOverlayUrl={customizations.videoPlayOverlayUrl}
                showWhatsappButton={customizations.showWhatsappButton}
                whatsappNumber={customizations.whatsappNumber}
                banners={banners}
                orderBumps={orderBumps}
                showDiscountPopup={customizations.showDiscountPopup}
                discountPopupPercentage={customizations.discountPopupPercentage}
              />
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Preview do Template */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              Preview: {(templates?.length ? templates : fallbackTemplateModels).find(m => m.template_code === previewingTemplate)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
            <div className="border rounded-lg overflow-hidden">
              {previewingTemplate && (
                <CheckoutPreviewMini
                  templateName={previewingTemplate}
                  productName={productName || "Produto"}
                  productPrice={productPrice}
                  primaryColor={primaryColor}
                  backgroundColor={backgroundColor}
                  showCountdown={customizations.showCountdown}
                  countdownMinutes={customizations.countdownMinutes}
                  countdownColor={customizations.countdownColor}
                  countdownText={customizations.countdownText}
                  showTestimonials={customizations.showTestimonials}
                  showBanner={customizations.showBanner}
                  bannerImageUrl={bannerImageUrl}
                  previewMode="desktop"
                  deliveryDescription={customizations.deliveryDescription}
                  requiredFields={requiredFields}
                  showVideo={customizations.showVideo}
                  videoUrl={customizations.videoUrl}
                  videoPosterUrl={customizations.videoPosterUrl}
                  videoPlayOverlayUrl={customizations.videoPlayOverlayUrl}
                  showWhatsappButton={customizations.showWhatsappButton}
                  whatsappNumber={customizations.whatsappNumber}
                  banners={banners}
                  orderBumps={orderBumps}
                  showDiscountPopup={customizations.showDiscountPopup}
                  discountPopupPercentage={customizations.discountPopupPercentage}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
