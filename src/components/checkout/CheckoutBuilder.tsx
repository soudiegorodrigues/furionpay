import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Type,
  Image,
  ThumbsUp,
  Shield,
  LayoutTemplate,
  List,
  Clock,
  Star,
  Video,
  Facebook,
  Monitor,
  Smartphone,
  MessageCircle,
  X as XIcon,
  Eye,
  Save,
  ChevronDown,
  MapPin,
  Phone,
  Calendar,
  CreditCard,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CheckoutBuilderProps {
  productId: string;
  userId: string;
  productName: string;
}

interface CheckoutComponent {
  id: string;
  name: string;
  icon: React.ElementType;
  enabled: boolean;
  description: string;
}

export function CheckoutBuilder({ productId, userId, productName }: CheckoutBuilderProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState("componentes");

  // Components state
  const [components, setComponents] = useState<CheckoutComponent[]>([
    { id: "texto", name: "Texto", icon: Type, enabled: false, description: "Adicione texto personalizado" },
    { id: "imagem", name: "Imagem", icon: Image, enabled: false, description: "Adicione uma imagem ou banner" },
    { id: "vantagens", name: "Vantagens", icon: ThumbsUp, enabled: false, description: "Liste os benefícios do produto" },
    { id: "selo", name: "Selo", icon: Shield, enabled: true, description: "Selos de garantia e segurança" },
    { id: "header", name: "Header", icon: LayoutTemplate, enabled: true, description: "Cabeçalho personalizado" },
    { id: "lista", name: "Lista", icon: List, enabled: false, description: "Lista de itens inclusos" },
    { id: "cronometro", name: "Cronômetro", icon: Clock, enabled: false, description: "Contagem regressiva" },
    { id: "depoimento", name: "Depoimento", icon: Star, enabled: false, description: "Depoimentos de clientes" },
    { id: "video", name: "Vídeo", icon: Video, enabled: false, description: "Adicione um vídeo" },
    { id: "facebook", name: "Facebook", icon: Facebook, enabled: false, description: "Comentários do Facebook" },
  ]);

  // Extra components
  const [extraComponents, setExtraComponents] = useState([
    { id: "exit-popup", name: "Exit Popup", icon: XIcon, enabled: false, description: "Popup ao sair da página" },
    { id: "chat", name: "Chat", icon: MessageCircle, enabled: false, description: "Chat de suporte" },
  ]);

  // Config state
  const [selectedColor, setSelectedColor] = useState("#16A34A");
  const [backgroundColor, setBackgroundColor] = useState("#f3f4f6");
  const [selectedTemplate, setSelectedTemplate] = useState("padrao");
  
  const [requiredFields, setRequiredFields] = useState({
    endereco: false,
    telefone: true,
    dataNascimento: false,
    cpf: false,
  });

  const [settings, setSettings] = useState({
    confirmacaoEmail: false,
    showSecurityBadges: true,
    showProductImage: true,
    botaoWhatsapp: false,
    paginaObrigado: false,
    notificacoes: false,
    personalizarBotao: false,
    banners: false,
  });

  const [texts, setTexts] = useState({
    checkoutTitle: "Finalizar Compra",
    checkoutSubtitle: "",
    buyerSectionTitle: "Dados do comprador",
    paymentSectionTitle: "Forma de pagamento",
    footerText: "Pagamento processado com segurança",
    securityBadgeText: "Pagamento Seguro",
    customButtonText: "",
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
      setSelectedColor(config.primary_color || "#16A34A");
      setBackgroundColor(config.background_color || "#f3f4f6");
      setSelectedTemplate(config.template || "padrao");
      setRequiredFields({
        endereco: config.require_address || false,
        telefone: config.require_phone !== false,
        dataNascimento: config.require_birthdate || false,
        cpf: config.require_cpf || false,
      });
      setSettings({
        confirmacaoEmail: config.require_email_confirmation || false,
        showSecurityBadges: config.show_security_badges !== false,
        showProductImage: config.show_product_image !== false,
        botaoWhatsapp: config.show_whatsapp_button || false,
        paginaObrigado: !!config.thank_you_url,
        notificacoes: config.show_notifications || false,
        personalizarBotao: !!config.custom_button_text,
        banners: config.show_banners || false,
      });
      setTexts({
        checkoutTitle: config.checkout_title || "Finalizar Compra",
        checkoutSubtitle: config.checkout_subtitle || "",
        buyerSectionTitle: config.buyer_section_title || "Dados do comprador",
        paymentSectionTitle: config.payment_section_title || "Forma de pagamento",
        footerText: config.footer_text || "Pagamento processado com segurança",
        securityBadgeText: config.security_badge_text || "Pagamento Seguro",
        customButtonText: config.custom_button_text || "",
      });

      // Update components based on config
      setComponents(prev => prev.map(comp => {
        if (comp.id === "cronometro") return { ...comp, enabled: config.show_countdown || false };
        if (comp.id === "selo") return { ...comp, enabled: config.show_security_badges !== false };
        return comp;
      }));
    }
  }, [config]);

  // Save config
  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const countdownEnabled = components.find(c => c.id === "cronometro")?.enabled || false;
      
      const configData = {
        product_id: productId,
        user_id: userId,
        primary_color: selectedColor,
        background_color: backgroundColor,
        template: selectedTemplate,
        require_address: requiredFields.endereco,
        require_phone: requiredFields.telefone,
        require_birthdate: requiredFields.dataNascimento,
        require_cpf: requiredFields.cpf,
        require_email_confirmation: settings.confirmacaoEmail,
        show_countdown: countdownEnabled,
        show_notifications: settings.notificacoes,
        show_banners: settings.banners,
        show_whatsapp_button: settings.botaoWhatsapp,
        show_security_badges: settings.showSecurityBadges,
        show_product_image: settings.showProductImage,
        checkout_title: texts.checkoutTitle,
        checkout_subtitle: texts.checkoutSubtitle || null,
        buyer_section_title: texts.buyerSectionTitle,
        payment_section_title: texts.paymentSectionTitle,
        footer_text: texts.footerText,
        security_badge_text: texts.securityBadgeText,
        custom_button_text: texts.customButtonText || null,
      };

      const { error } = await supabase
        .from("product_checkout_configs")
        .upsert(configData, { onConflict: "product_id" });

      if (error) throw error;
      
      toast.success("Configurações salvas");
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
  }, [selectedColor, backgroundColor, selectedTemplate, requiredFields, settings, texts, components]);

  const toggleComponent = (id: string) => {
    setComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, enabled: !comp.enabled } : comp
    ));
  };

  const toggleExtraComponent = (id: string) => {
    setExtraComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, enabled: !comp.enabled } : comp
    ));
  };

  const colors = [
    "#000000", "#dc2626", "#ea580c", "#eab308", "#16a34a", "#06b6d4", "#3b82f6",
    "#2563eb", "#7c3aed", "#c026d3", "#ca8a04", "#6b7280",
  ];

  const templates = [
    { id: "padrao", name: "Padrão" },
    { id: "vega", name: "Vega" },
    { id: "afilia", name: "Afilia" },
    { id: "multistep", name: "Multistep" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Preview Panel - Left Side */}
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{productName}</CardTitle>
            </div>
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
                "mx-auto border rounded-lg overflow-hidden transition-all duration-300",
                previewMode === "mobile" ? "max-w-[375px]" : "w-full"
              )}
              style={{ backgroundColor }}
            >
              {/* Countdown Preview */}
              {components.find(c => c.id === "cronometro")?.enabled && (
                <div 
                  className="py-3 px-4 text-white text-center flex items-center justify-center gap-2"
                  style={{ backgroundColor: selectedColor }}
                >
                  <Clock className="h-4 w-4" />
                  <span className="font-bold">04:33</span>
                  <span className="text-sm">Preencha seus dados corretamente</span>
                </div>
              )}

              {/* Header Preview */}
              {components.find(c => c.id === "header")?.enabled && (
                <div className="p-4 border-b bg-background">
                  <h2 className="text-lg font-semibold">{texts.checkoutTitle}</h2>
                  {texts.checkoutSubtitle && (
                    <p className="text-sm text-muted-foreground">{texts.checkoutSubtitle}</p>
                  )}
                </div>
              )}

              {/* Image Preview */}
              {components.find(c => c.id === "imagem")?.enabled && (
                <div className="p-4 border-b">
                  <div className="bg-muted rounded-lg h-32 flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Product Summary */}
              <div className="p-4 bg-background">
                <div className="flex items-start gap-3">
                  {settings.showProductImage && (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{productName}</p>
                    <p className="text-primary font-bold">1 X de R$ 25,00</p>
                    <p className="text-xs text-muted-foreground">ou R$ 25,00 à vista</p>
                  </div>
                </div>
              </div>

              {/* Form Preview */}
              <div className="p-4 space-y-4 bg-background">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">👤</span>
                  {texts.buyerSectionTitle}
                </h3>
                <div className="space-y-2">
                  <div className="h-10 bg-muted rounded border" />
                  <div className="h-10 bg-muted rounded border" />
                  {requiredFields.cpf && <div className="h-10 bg-muted rounded border" />}
                  {requiredFields.telefone && <div className="h-10 bg-muted rounded border" />}
                </div>

                <h3 className="font-medium flex items-center gap-2 pt-4">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">💳</span>
                  {texts.paymentSectionTitle}
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" style={{ backgroundColor: selectedColor }} className="text-white">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Pix
                  </Button>
                </div>
              </div>

              {/* Depoimento Preview */}
              {components.find(c => c.id === "depoimento")?.enabled && (
                <div className="p-4 border-t bg-background">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div>
                      <p className="text-sm font-medium">Cliente Satisfeito</p>
                      <div className="flex text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Selo Preview */}
              {components.find(c => c.id === "selo")?.enabled && settings.showSecurityBadges && (
                <div className="p-4 border-t bg-background">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>{texts.securityBadgeText}</span>
                  </div>
                </div>
              )}

              {/* Footer Preview */}
              <div className="p-3 border-t text-center text-xs text-muted-foreground bg-background">
                {texts.footerText}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Builder Panel - Right Side */}
      <div className="lg:w-80 shrink-0">
        <Card className="sticky top-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="componentes">Componentes</TabsTrigger>
              <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="componentes" className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Componentes</p>
              
              <div className="grid grid-cols-2 gap-2">
                {components.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => toggleComponent(comp.id)}
                    className={cn(
                      "p-3 rounded-lg border text-center transition-all hover:shadow-sm",
                      comp.enabled 
                        ? "bg-primary/10 border-primary" 
                        : "bg-background hover:bg-muted/50"
                    )}
                  >
                    <comp.icon className={cn(
                      "h-5 w-5 mx-auto mb-1",
                      comp.enabled ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      comp.enabled ? "text-primary" : "text-foreground"
                    )}>
                      {comp.name}
                    </span>
                  </button>
                ))}
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground uppercase tracking-wide">Componentes Extra</p>
              
              <div className="space-y-2">
                {extraComponents.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <comp.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">{comp.name}</span>
                    </div>
                    <Switch
                      checked={comp.enabled}
                      onCheckedChange={() => toggleExtraComponent(comp.id)}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="configuracoes" className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Color Picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Cor Principal</Label>
                <div className="flex flex-wrap gap-1.5">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        selectedColor === color ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <Input 
                    value={selectedColor} 
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="h-8 w-24 font-mono text-xs"
                  />
                </div>
              </div>

              <Separator />

              {/* Template Selector */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Template</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => (
                    <Button
                      key={template.id}
                      variant={selectedTemplate === template.id ? "default" : "outline"}
                      size="sm"
                      className="h-8"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Required Fields */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Campos Obrigatórios</Label>
                <div className="space-y-2">
                  {[
                    { key: "endereco", label: "Endereço", icon: MapPin },
                    { key: "telefone", label: "Telefone", icon: Phone },
                    { key: "dataNascimento", label: "Data Nascimento", icon: Calendar },
                    { key: "cpf", label: "CPF", icon: CreditCard },
                  ].map((field) => (
                    <div key={field.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <field.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{field.label}</span>
                      </div>
                      <Switch
                        checked={requiredFields[field.key as keyof typeof requiredFields]}
                        onCheckedChange={() => setRequiredFields(prev => ({
                          ...prev,
                          [field.key]: !prev[field.key as keyof typeof requiredFields]
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Options */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Opções</Label>
                <div className="space-y-2">
                  {[
                    { key: "confirmacaoEmail", label: "Confirmação de Email" },
                    { key: "showSecurityBadges", label: "Badges de Segurança" },
                    { key: "showProductImage", label: "Imagem do Produto" },
                    { key: "botaoWhatsapp", label: "Botão WhatsApp" },
                    { key: "notificacoes", label: "Notificações" },
                  ].map((option) => (
                    <div key={option.key} className="flex items-center justify-between">
                      <span className="text-sm">{option.label}</span>
                      <Switch
                        checked={settings[option.key as keyof typeof settings]}
                        onCheckedChange={() => setSettings(prev => ({
                          ...prev,
                          [option.key]: !prev[option.key as keyof typeof settings]
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Texts */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide cursor-pointer">Textos</Label>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  <div>
                    <Label className="text-xs">Título</Label>
                    <Input
                      value={texts.checkoutTitle}
                      onChange={(e) => setTexts(prev => ({ ...prev, checkoutTitle: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Subtítulo</Label>
                    <Input
                      value={texts.checkoutSubtitle}
                      onChange={(e) => setTexts(prev => ({ ...prev, checkoutSubtitle: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Seção Dados</Label>
                    <Input
                      value={texts.buyerSectionTitle}
                      onChange={(e) => setTexts(prev => ({ ...prev, buyerSectionTitle: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Texto do Rodapé</Label>
                    <Input
                      value={texts.footerText}
                      onChange={(e) => setTexts(prev => ({ ...prev, footerText: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
