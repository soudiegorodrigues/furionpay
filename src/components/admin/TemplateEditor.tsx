import { useState, DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, 
  Save, 
  Monitor, 
  Smartphone,
  Eye,
  Type,
  Image,
  Clock,
  Users,
  ShieldCheck,
  CreditCard,
  FileText,
  MessageSquare,
  Check,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Layers,
  Sparkles,
  Video,
  List,
  Star,
  BadgeCheck,
  Facebook,
  MapPin,
  Loader2,
  X,
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
    background: "#f8fafc",
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
    buyerSectionTitle: "Seus dados",
    paymentSectionTitle: "Pagamento",
    buttonText: "COMPRAR AGORA",
    footerText: "Pagamento processado com segurança",
    securityBadgeText: "Compra Segura",
  },
  settings: {
    showLogo: true,
    logoUrl: "",
    showProductImage: true,
    borderRadius: "8px",
  },
};

// Available components for the palette
const componentPalette = [
  { type: "text", name: "Texto", icon: Type },
  { type: "image", name: "Imagem", icon: Image },
  { type: "benefits", name: "Vantagens", icon: Check },
  { type: "badge", name: "Selo", icon: BadgeCheck },
  { type: "header", name: "Header", icon: Layers },
  { type: "list", name: "Lista", icon: List },
  { type: "countdown", name: "Cronômetro", icon: Clock },
  { type: "testimonials", name: "Depoimento", icon: MessageSquare },
  { type: "video", name: "Vídeo", icon: Video },
  { type: "facebook", name: "Facebook", icon: Facebook },
  { type: "map", name: "Mapa", icon: MapPin },
];

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
  const [activeTab, setActiveTab] = useState<"components" | "config">("components");
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [fullPreviewMode, setFullPreviewMode] = useState<"desktop" | "mobile">("desktop");
  
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

  const removeComponent = (componentId: string) => {
    setConfig(prev => ({
      ...prev,
      components: prev.components.filter(comp => comp.id !== componentId),
    }));
    if (selectedComponent === componentId) {
      setSelectedComponent(null);
    }
  };

  const addComponent = (type: string, name: string) => {
    const newId = `${type}-${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      components: [...prev.components, {
        id: newId,
        type,
        name,
        enabled: true,
        config: {},
      }],
    }));
  };

  const handleDragStart = (e: DragEvent, type: string, name: string) => {
    setDraggedComponent(type);
    e.dataTransfer.setData("componentType", type);
    e.dataTransfer.setData("componentName", name);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("componentType");
    const name = e.dataTransfer.getData("componentName");
    if (type && name) {
      addComponent(type, name);
    }
    setDraggedComponent(null);
  };

  const moveComponent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= config.components.length) return;
    
    setConfig(prev => {
      const newComponents = [...prev.components];
      const [removed] = newComponents.splice(fromIndex, 1);
      newComponents.splice(toIndex, 0, removed);
      return { ...prev, components: newComponents };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#111] shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-white">{template.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Preview Mode Toggle */}
          <div className="flex items-center bg-[#222] rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setPreviewMode("desktop")}
              className={cn(
                "p-2 rounded-md transition-all",
                previewMode === "desktop"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white"
              )}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPreviewMode("mobile")}
              className={cn(
                "p-2 rounded-md transition-all",
                previewMode === "mobile"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white"
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-4 text-sm font-medium"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>

          <Button 
            variant="outline"
            onClick={() => setShowFullPreview(true)}
            className="border-white/20 text-white h-9 px-4 text-sm hover:bg-white/10"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 bg-[#0d0d0d] overflow-auto p-6">
          <div className={cn(
            "mx-auto transition-all duration-300",
            previewMode === "mobile" ? "max-w-md" : "max-w-5xl"
          )}>
            {/* Drop Zone */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn(
                "mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-all",
                draggedComponent 
                  ? "border-emerald-500 bg-emerald-500/10" 
                  : "border-white/20 bg-white/5"
              )}
            >
              <p className="text-white/40 text-sm">
                {draggedComponent ? "Solte o componente aqui" : "Arraste componentes aqui"}
              </p>
            </div>

            {/* Active Components */}
            <div className="space-y-2 mb-6">
              {config.components.filter(c => c.enabled).map((component, index) => (
                <div 
                  key={component.id}
                  onClick={() => setSelectedComponent(component.id)}
                  className={cn(
                    "group flex items-center gap-3 p-3 bg-white/5 rounded-lg border transition-all cursor-pointer",
                    selectedComponent === component.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveComponent(index, index - 1); }}
                      className="p-1 text-white/30 hover:text-white"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  
                  <span className="flex-1 text-sm text-white">{component.name}</span>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); removeComponent(component.id); }}
                    className="p-1 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Live Preview */}
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              <TemplateEditorPreview config={config} previewMode={previewMode} />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[320px] border-l border-white/10 bg-[#111] flex flex-col shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("components")}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                activeTab === "components"
                  ? "text-emerald-400 border-emerald-400"
                  : "text-white/50 border-transparent hover:text-white"
              )}
            >
              Componentes
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                activeTab === "config"
                  ? "text-emerald-400 border-emerald-400"
                  : "text-white/50 border-transparent hover:text-white"
              )}
            >
              Configurações
            </button>
          </div>

          <ScrollArea className="flex-1">
            {/* Components Tab */}
            {activeTab === "components" && (
              <div className="p-4">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
                  Componentes
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {componentPalette.map((comp) => {
                    const Icon = comp.icon;
                    return (
                      <div
                        key={comp.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, comp.type, comp.name)}
                        onClick={() => addComponent(comp.type, comp.name)}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl cursor-grab transition-all active:cursor-grabbing"
                      >
                        <Icon className="h-6 w-6 text-white/60" />
                        <span className="text-xs text-white/80">{comp.name}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
                    Componentes Ativos
                  </p>

                  <div className="space-y-1">
                    {config.components.map((component) => (
                      <div 
                        key={component.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg transition-all",
                          component.enabled
                            ? "bg-emerald-500/10 text-white"
                            : "bg-white/5 text-white/40"
                        )}
                      >
                        <button
                          onClick={() => toggleComponent(component.id)}
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                            component.enabled
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-white/30"
                          )}
                        >
                          {component.enabled && <Check className="h-2.5 w-2.5 text-white" />}
                        </button>
                        <span className="text-xs flex-1">{component.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Config Tab */}
            {activeTab === "config" && (
              <div className="p-4 space-y-6">
                {/* Template Type Selector */}
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
                    Estilo do Template
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "padrao", name: "Padrão", desc: "Estilo Kiwify" },
                      { id: "vega", name: "Vega", desc: "Dark Premium" },
                      { id: "afilia", name: "Afilia", desc: "E-commerce" },
                      { id: "multistep", name: "Multistep", desc: "Por etapas" },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setConfig(prev => ({ ...prev, type: style.id }))}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all",
                          config.type === style.id || (config.type === "custom" && style.id === "padrao")
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        )}
                      >
                        <p className="text-sm font-medium text-white">{style.name}</p>
                        <p className="text-[10px] text-white/50">{style.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
                    Cor Principal
                  </p>
                  
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {presetColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateColor("primary", color.value)}
                        className={cn(
                          "h-10 rounded-lg transition-all relative",
                          config.colors.primary === color.value
                            ? "ring-2 ring-white ring-offset-2 ring-offset-[#111]"
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color.value }}
                      >
                        {config.colors.primary === color.value && (
                          <Check className="h-4 w-4 text-white absolute inset-0 m-auto" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.colors.primary}
                      onChange={(e) => updateColor("primary", e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-white/10"
                    />
                    <Input
                      value={config.colors.primary}
                      onChange={(e) => updateColor("primary", e.target.value)}
                      className="h-10 bg-white/5 border-white/10 text-white font-mono text-sm flex-1"
                    />
                  </div>
                </div>

                {/* Texts */}
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
                    Textos
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-white/60 mb-1 block">Título</Label>
                      <Input
                        value={config.labels.checkoutTitle}
                        onChange={(e) => updateLabel("checkoutTitle", e.target.value)}
                        className="h-9 bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-white/60 mb-1 block">Seção: Dados</Label>
                      <Input
                        value={config.labels.buyerSectionTitle}
                        onChange={(e) => updateLabel("buyerSectionTitle", e.target.value)}
                        className="h-9 bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-white/60 mb-1 block">Seção: Pagamento</Label>
                      <Input
                        value={config.labels.paymentSectionTitle}
                        onChange={(e) => updateLabel("paymentSectionTitle", e.target.value)}
                        className="h-9 bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-white/60 mb-1 block">Botão</Label>
                      <Input
                        value={config.labels.buttonText}
                        onChange={(e) => updateLabel("buttonText", e.target.value)}
                        className="h-9 bg-white/5 border-white/10 text-white text-sm font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-white/60 mb-1 block">Rodapé</Label>
                      <Input
                        value={config.labels.footerText}
                        onChange={(e) => updateLabel("footerText", e.target.value)}
                        className="h-9 bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
                    Opções
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">Mostrar logo</span>
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
                        className="h-9 bg-white/5 border-white/10 text-white text-sm"
                        placeholder="URL do logo..."
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">Imagem do produto</span>
                      <Switch
                        checked={config.settings.showProductImage}
                        onCheckedChange={(v) => updateSetting("showProductImage", v)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Border Radius */}
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
                    Arredondamento
                  </p>
                  
                  <div className="flex gap-1">
                    {["0px", "4px", "8px", "12px", "16px"].map((radius) => (
                      <button
                        key={radius}
                        onClick={() => updateSetting("borderRadius", radius)}
                        className={cn(
                          "flex-1 h-9 border text-xs font-medium transition-all",
                          config.settings.borderRadius === radius
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "border-white/20 text-white/60 hover:border-white/40"
                        )}
                        style={{ borderRadius: radius }}
                      >
                        {parseInt(radius)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Full Screen Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col">
          {/* Modal Header */}
          <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-white font-medium">Preview: {template.name}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Preview Mode Toggle */}
              <div className="flex items-center bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setFullPreviewMode("desktop")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    fullPreviewMode === "desktop"
                      ? "bg-white/20 text-white"
                      : "text-white/40 hover:text-white"
                  )}
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFullPreviewMode("mobile")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    fullPreviewMode === "mobile"
                      ? "bg-white/20 text-white"
                      : "text-white/40 hover:text-white"
                  )}
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFullPreview(false)}
                className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
            <div 
              className={cn(
                "transition-all duration-300 shadow-2xl",
                fullPreviewMode === "mobile" 
                  ? "w-[375px] rounded-[2.5rem] border-[14px] border-zinc-800 bg-zinc-800" 
                  : "w-full max-w-5xl rounded-xl overflow-hidden"
              )}
            >
              {fullPreviewMode === "mobile" && (
                <div className="h-6 bg-zinc-800 flex items-center justify-center">
                  <div className="w-20 h-5 bg-black rounded-full" />
                </div>
              )}
              <div className={cn(
                "bg-white overflow-hidden",
                fullPreviewMode === "mobile" ? "rounded-b-[2rem]" : "rounded-xl"
              )}>
                <TemplateEditorPreview config={config} previewMode={fullPreviewMode} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
