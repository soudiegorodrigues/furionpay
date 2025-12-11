import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, 
  Save, 
  Palette, 
  LayoutGrid, 
  Type, 
  Monitor, 
  Smartphone,
  GripVertical,
  Eye,
  EyeOff,
  Settings2,
  Sparkles,
  Image,
  Clock,
  Users,
  ShieldCheck,
  CreditCard,
  FileText,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Paintbrush,
  Square,
  Circle,
  Loader2,
} from "lucide-react";
import { TemplateEditorPreview } from "./TemplateEditorPreview";

export interface TemplateConfig {
  type: string;
  colors: {
    primary: string;
    background: string;
    cardBackground: string;
    text: string;
    mutedText: string;
    border: string;
    buttonText: string;
  };
  components: ComponentConfig[];
  labels: {
    checkoutTitle: string;
    checkoutSubtitle: string;
    buyerSectionTitle: string;
    paymentSectionTitle: string;
    buttonText: string;
    footerText: string;
    securityBadgeText: string;
  };
  settings: {
    showLogo: boolean;
    logoUrl: string;
    showProductImage: boolean;
    borderRadius: string;
  };
}

export interface ComponentConfig {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface TemplateEditorProps {
  template: {
    id: string;
    name: string;
    layout_config: Record<string, unknown>;
  };
  onClose: () => void;
}

const defaultConfig: TemplateConfig = {
  type: "custom",
  colors: {
    primary: "#16A34A",
    background: "#f3f4f6",
    cardBackground: "#ffffff",
    text: "#1f2937",
    mutedText: "#6b7280",
    border: "#e5e7eb",
    buttonText: "#ffffff",
  },
  components: [
    { id: "header", type: "header", name: "Cabeçalho", enabled: true, config: {} },
    { id: "product", type: "productInfo", name: "Informações do Produto", enabled: true, config: {} },
    { id: "countdown", type: "countdown", name: "Cronômetro", enabled: false, config: { minutes: 15 } },
    { id: "buyer", type: "buyerForm", name: "Formulário do Comprador", enabled: true, config: {} },
    { id: "payment", type: "payment", name: "Pagamento PIX", enabled: true, config: {} },
    { id: "testimonials", type: "testimonials", name: "Depoimentos", enabled: false, config: { items: [] } },
    { id: "security", type: "securityBadges", name: "Selos de Segurança", enabled: true, config: {} },
    { id: "footer", type: "footer", name: "Rodapé", enabled: true, config: {} },
  ],
  labels: {
    checkoutTitle: "Finalizar Compra",
    checkoutSubtitle: "",
    buyerSectionTitle: "Dados do comprador",
    paymentSectionTitle: "Forma de pagamento",
    buttonText: "FINALIZAR COMPRA",
    footerText: "Pagamento processado com segurança",
    securityBadgeText: "Pagamento Seguro",
  },
  settings: {
    showLogo: true,
    logoUrl: "",
    showProductImage: true,
    borderRadius: "12px",
  },
};

const componentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  header: Image,
  productInfo: FileText,
  countdown: Clock,
  buyerForm: Users,
  payment: CreditCard,
  testimonials: MessageSquare,
  securityBadges: ShieldCheck,
  footer: FileText,
};

const presetColors = [
  { name: "Esmeralda", value: "#10B981" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Violeta", value: "#8B5CF6" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Laranja", value: "#F97316" },
  { name: "Âmbar", value: "#F59E0B" },
  { name: "Ciano", value: "#06B6D4" },
];

export function TemplateEditor({ template, onClose }: TemplateEditorProps) {
  const queryClient = useQueryClient();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeSection, setActiveSection] = useState<"layers" | "design" | "content">("layers");
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  
  const [config, setConfig] = useState<TemplateConfig>(() => {
    const existingConfig = template.layout_config as Partial<TemplateConfig>;
    return {
      ...defaultConfig,
      ...existingConfig,
      colors: { ...defaultConfig.colors, ...(existingConfig.colors || {}) },
      labels: { ...defaultConfig.labels, ...(existingConfig.labels || {}) },
      settings: { ...defaultConfig.settings, ...(existingConfig.settings || {}) },
      components: existingConfig.components?.length 
        ? existingConfig.components as ComponentConfig[]
        : defaultConfig.components,
    };
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("checkout_templates")
        .update({ layout_config: JSON.parse(JSON.stringify(config)) })
        .eq("id", template.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-templates"] });
      toast.success("Template salvo!");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const updateColor = (key: keyof TemplateConfig["colors"], value: string) => {
    setConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const updateLabel = (key: keyof TemplateConfig["labels"], value: string) => {
    setConfig(prev => ({
      ...prev,
      labels: { ...prev.labels, [key]: value },
    }));
  };

  const updateSetting = (key: keyof TemplateConfig["settings"], value: unknown) => {
    setConfig(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  const toggleComponent = (componentId: string) => {
    setConfig(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === componentId ? { ...comp, enabled: !comp.enabled } : comp
      ),
    }));
  };

  const enabledCount = config.components.filter(c => c.enabled).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#111111] shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="h-5 w-px bg-white/10" />
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-white">{template.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview Mode Toggle */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => setPreviewMode("desktop")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                previewMode === "desktop"
                  ? "bg-white text-black"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setPreviewMode("mobile")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                previewMode === "mobile"
                  ? "bg-white text-black"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>

          <div className="h-5 w-px bg-white/10" />

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-4 text-xs font-medium"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-[300px] border-r border-white/10 bg-[#111111] flex flex-col shrink-0">
          {/* Section Tabs */}
          <div className="flex border-b border-white/10">
            {[
              { id: "layers", icon: Layers, label: "Camadas" },
              { id: "design", icon: Paintbrush, label: "Design" },
              { id: "content", icon: Type, label: "Conteúdo" },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as typeof activeSection)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 -mb-px",
                  activeSection === section.id
                    ? "text-white border-emerald-500"
                    : "text-white/50 border-transparent hover:text-white/80"
                )}
              >
                <section.icon className="h-3.5 w-3.5" />
                {section.label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            {/* Layers Section */}
            {activeSection === "layers" && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                    Componentes
                  </span>
                  <span className="text-[10px] text-white/30">
                    {enabledCount}/{config.components.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {config.components.map((component) => {
                    const Icon = componentIcons[component.type] || FileText;
                    const isExpanded = expandedComponent === component.id;
                    
                    return (
                      <div key={component.id}>
                        <div 
                          className={cn(
                            "group flex items-center gap-2 px-2 py-2 rounded-lg transition-all cursor-pointer",
                            component.enabled
                              ? "hover:bg-white/5"
                              : "opacity-40"
                          )}
                        >
                          <button className="text-white/20 hover:text-white/40 cursor-grab">
                            <GripVertical className="h-3 w-3" />
                          </button>
                          
                          <button
                            onClick={() => setExpandedComponent(isExpanded ? null : component.id)}
                            className="text-white/30"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>

                          <div className={cn(
                            "w-6 h-6 rounded flex items-center justify-center",
                            component.enabled
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-white/5 text-white/30"
                          )}>
                            <Icon className="h-3 w-3" />
                          </div>

                          <span className={cn(
                            "flex-1 text-xs",
                            component.enabled ? "text-white" : "text-white/40"
                          )}>
                            {component.name}
                          </span>

                          <button
                            onClick={() => toggleComponent(component.id)}
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-all",
                              component.enabled
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-white/20 hover:border-white/40"
                            )}
                          >
                            {component.enabled && <Check className="h-2.5 w-2.5 text-white" />}
                          </button>
                        </div>

                        {/* Expanded Component Settings */}
                        {isExpanded && component.enabled && (
                          <div className="ml-9 mr-2 mt-1 mb-2 p-2 bg-white/5 rounded-lg border border-white/5">
                            <p className="text-[10px] text-white/40">
                              Configurações específicas do componente em breve.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Design Section */}
            {activeSection === "design" && (
              <div className="p-3 space-y-4">
                {/* Primary Color */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                      Cor Principal
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {presetColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateColor("primary", color.value)}
                        className={cn(
                          "h-8 rounded-lg transition-all relative group",
                          config.colors.primary === color.value
                            ? "ring-2 ring-white ring-offset-2 ring-offset-[#111]"
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {config.colors.primary === color.value && (
                          <Check className="h-3 w-3 text-white absolute inset-0 m-auto" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={config.colors.primary}
                        onChange={(e) => updateColor("primary", e.target.value)}
                        className="w-10 h-8 rounded-lg cursor-pointer border border-white/10"
                      />
                    </div>
                    <Input
                      value={config.colors.primary}
                      onChange={(e) => updateColor("primary", e.target.value)}
                      className="h-8 bg-white/5 border-white/10 text-white font-mono text-xs flex-1"
                    />
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Other Colors */}
                <div>
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block mb-3">
                    Cores do Layout
                  </span>
                  
                  <div className="space-y-2">
                    {[
                      { key: "background" as const, label: "Fundo" },
                      { key: "cardBackground" as const, label: "Cards" },
                      { key: "text" as const, label: "Texto" },
                      { key: "mutedText" as const, label: "Texto secundário" },
                      { key: "border" as const, label: "Bordas" },
                      { key: "buttonText" as const, label: "Texto do botão" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.colors[key]}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border border-white/10 shrink-0"
                        />
                        <span className="text-xs text-white/60 flex-1">{label}</span>
                        <Input
                          value={config.colors[key]}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="h-7 w-20 bg-white/5 border-white/10 text-white font-mono text-[10px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Border Radius */}
                <div>
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block mb-3">
                    Arredondamento
                  </span>
                  
                  <div className="flex gap-1">
                    {["0px", "4px", "8px", "12px", "16px", "24px"].map((radius) => (
                      <button
                        key={radius}
                        onClick={() => updateSetting("borderRadius", radius)}
                        className={cn(
                          "flex-1 h-8 border transition-all text-[10px] font-medium",
                          config.settings.borderRadius === radius
                            ? "bg-white text-black border-white"
                            : "border-white/20 text-white/60 hover:border-white/40"
                        )}
                        style={{ borderRadius: radius }}
                      >
                        {parseInt(radius)}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Settings */}
                <div>
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block mb-3">
                    Opções
                  </span>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-white/80">Mostrar logo</span>
                      <Switch
                        checked={config.settings.showLogo}
                        onCheckedChange={(v) => updateSetting("showLogo", v)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                    
                    {config.settings.showLogo && (
                      <Input
                        value={config.settings.logoUrl}
                        onChange={(e) => updateSetting("logoUrl", e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-white text-xs"
                        placeholder="URL do logo..."
                      />
                    )}

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-white/80">Imagem do produto</span>
                      <Switch
                        checked={config.settings.showProductImage}
                        onCheckedChange={(v) => updateSetting("showProductImage", v)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content Section */}
            {activeSection === "content" && (
              <div className="p-3 space-y-4">
                <div>
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block mb-3">
                    Títulos
                  </span>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-[10px] text-white/50 mb-1 block">Título principal</Label>
                      <Input
                        value={config.labels.checkoutTitle}
                        onChange={(e) => updateLabel("checkoutTitle", e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-white text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-white/50 mb-1 block">Subtítulo</Label>
                      <Input
                        value={config.labels.checkoutSubtitle}
                        onChange={(e) => updateLabel("checkoutSubtitle", e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-white text-xs"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block mb-3">
                    Seções
                  </span>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-[10px] text-white/50 mb-1 block">Dados do comprador</Label>
                      <Input
                        value={config.labels.buyerSectionTitle}
                        onChange={(e) => updateLabel("buyerSectionTitle", e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-white text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-white/50 mb-1 block">Pagamento</Label>
                      <Input
                        value={config.labels.paymentSectionTitle}
                        onChange={(e) => updateLabel("paymentSectionTitle", e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block mb-3">
                    Botão e Rodapé
                  </span>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-[10px] text-white/50 mb-1 block">Texto do botão</Label>
                      <Input
                        value={config.labels.buttonText}
                        onChange={(e) => updateLabel("buttonText", e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-white text-xs font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-white/50 mb-1 block">Selo de segurança</Label>
                      <Input
                        value={config.labels.securityBadgeText}
                        onChange={(e) => updateLabel("securityBadgeText", e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-white text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-white/50 mb-1 block">Rodapé</Label>
                      <Input
                        value={config.labels.footerText}
                        onChange={(e) => updateLabel("footerText", e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 bg-[#0a0a0a] overflow-auto flex items-start justify-center p-8">
          <div 
            className={cn(
              "transition-all duration-300",
              previewMode === "mobile" ? "w-[375px]" : "w-full max-w-[1100px]"
            )}
          >
            {/* Device Frame */}
            <div className={cn(
              "rounded-2xl overflow-hidden shadow-2xl",
              previewMode === "mobile"
                ? "bg-[#1a1a1a] p-3 border border-white/10"
                : "border border-white/5"
            )}>
              {/* Mobile Notch */}
              {previewMode === "mobile" && (
                <div className="flex justify-center mb-2">
                  <div className="w-24 h-5 bg-black rounded-full" />
                </div>
              )}
              
              <div className={cn(
                "overflow-hidden bg-white",
                previewMode === "mobile" && "rounded-2xl"
              )}>
                <TemplateEditorPreview config={config} previewMode={previewMode} />
              </div>

              {/* Mobile Home Indicator */}
              {previewMode === "mobile" && (
                <div className="flex justify-center mt-2">
                  <div className="w-28 h-1 bg-white/20 rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
