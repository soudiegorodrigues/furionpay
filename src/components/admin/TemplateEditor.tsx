import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
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
  Zap,
  ChevronRight,
  Check,
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

const componentIcons: Record<string, React.ReactNode> = {
  header: <Image className="h-4 w-4" />,
  productInfo: <FileText className="h-4 w-4" />,
  countdown: <Clock className="h-4 w-4" />,
  buyerForm: <Users className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  testimonials: <MessageSquare className="h-4 w-4" />,
  securityBadges: <ShieldCheck className="h-4 w-4" />,
  footer: <FileText className="h-4 w-4" />,
};

const quickColors = [
  "#16A34A", "#22C55E", "#10B981", // Greens
  "#3B82F6", "#6366F1", "#8B5CF6", // Blues/Purples
  "#EF4444", "#F97316", "#EAB308", // Warm
  "#EC4899", "#14B8A6", "#000000", // Others
];

export function TemplateEditor({ template, onClose }: TemplateEditorProps) {
  const queryClient = useQueryClient();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState("components");
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
      toast.success("Template salvo com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
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
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Modern Header */}
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-white">{template.name}</h1>
              <p className="text-xs text-zinc-500">Editor de Template</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Preview Toggle */}
          <div className="flex items-center bg-zinc-800/50 rounded-xl p-1 border border-zinc-700/50">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 rounded-lg transition-all",
                previewMode === "desktop" 
                  ? "bg-zinc-700 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-white"
              )}
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="h-4 w-4 mr-1.5" />
              Desktop
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 rounded-lg transition-all",
                previewMode === "mobile" 
                  ? "bg-zinc-700 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-white"
              )}
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="h-4 w-4 mr-1.5" />
              Mobile
            </Button>
          </div>
          
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-white px-5 h-10 rounded-xl font-medium shadow-lg shadow-primary/25"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-[380px] border-r border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0">
          {/* Tabs */}
          <div className="p-3 border-b border-zinc-800/50">
            <div className="flex gap-1 bg-zinc-800/50 rounded-xl p-1">
              {[
                { id: "components", icon: LayoutGrid, label: "Blocos" },
                { id: "colors", icon: Palette, label: "Cores" },
                { id: "labels", icon: Type, label: "Textos" },
                { id: "settings", icon: Settings2, label: "Config" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-zinc-700 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {/* Components Tab */}
            {activeTab === "components" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-white">Componentes</h3>
                    <p className="text-xs text-zinc-500">Arraste para reordenar</p>
                  </div>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                    {enabledCount} ativos
                  </Badge>
                </div>

                <div className="space-y-2">
                  {config.components.map((component) => (
                    <div 
                      key={component.id}
                      className={cn(
                        "group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                        component.enabled
                          ? "bg-zinc-800/50 border-zinc-700/50 hover:border-primary/50"
                          : "bg-zinc-900/50 border-zinc-800/30 opacity-60 hover:opacity-80"
                      )}
                      onClick={() => toggleComponent(component.id)}
                    >
                      <div className="text-zinc-600 hover:text-zinc-400 cursor-grab">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                        component.enabled
                          ? "bg-primary/20 text-primary"
                          : "bg-zinc-800 text-zinc-500"
                      )}>
                        {componentIcons[component.type] || <FileText className="h-4 w-4" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          component.enabled ? "text-white" : "text-zinc-500"
                        )}>
                          {component.name}
                        </p>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">
                          {component.type}
                        </p>
                      </div>

                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        component.enabled
                          ? "bg-primary border-primary"
                          : "border-zinc-600"
                      )}>
                        {component.enabled && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Colors Tab */}
            {activeTab === "colors" && (
              <div className="p-4 space-y-6">
                {/* Quick Colors */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Cor Principal</h3>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {quickColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => updateColor("primary", color)}
                        className={cn(
                          "w-10 h-10 rounded-xl border-2 transition-all hover:scale-110",
                          config.colors.primary === color
                            ? "border-white shadow-lg"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={config.colors.primary}
                        onChange={(e) => updateColor("primary", e.target.value)}
                        className="w-12 h-10 rounded-xl border border-zinc-700 cursor-pointer bg-transparent"
                      />
                    </div>
                    <Input
                      value={config.colors.primary}
                      onChange={(e) => updateColor("primary", e.target.value)}
                      className="h-10 bg-zinc-800/50 border-zinc-700 text-white font-mono text-sm flex-1"
                      placeholder="#16A34A"
                    />
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                {/* Other Colors */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white">Outras Cores</h3>
                  
                  {[
                    { key: "background" as const, label: "Fundo da Página" },
                    { key: "cardBackground" as const, label: "Fundo do Card" },
                    { key: "text" as const, label: "Texto Principal" },
                    { key: "mutedText" as const, label: "Texto Secundário" },
                    { key: "border" as const, label: "Bordas" },
                    { key: "buttonText" as const, label: "Texto do Botão" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.colors[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-transparent shrink-0"
                      />
                      <div className="flex-1">
                        <Label className="text-xs text-zinc-400">{label}</Label>
                        <Input
                          value={config.colors[key]}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="h-8 mt-1 bg-zinc-800/50 border-zinc-700 text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labels Tab */}
            {activeTab === "labels" && (
              <div className="p-4 space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-white mb-4">Textos do Checkout</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-zinc-400 mb-1.5 block">Título Principal</Label>
                      <Input
                        value={config.labels.checkoutTitle}
                        onChange={(e) => updateLabel("checkoutTitle", e.target.value)}
                        className="h-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Finalizar Compra"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-zinc-400 mb-1.5 block">Subtítulo</Label>
                      <Input
                        value={config.labels.checkoutSubtitle}
                        onChange={(e) => updateLabel("checkoutSubtitle", e.target.value)}
                        className="h-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Opcional"
                      />
                    </div>

                    <Separator className="bg-zinc-800" />

                    <div>
                      <Label className="text-xs text-zinc-400 mb-1.5 block">Seção: Dados do Comprador</Label>
                      <Input
                        value={config.labels.buyerSectionTitle}
                        onChange={(e) => updateLabel("buyerSectionTitle", e.target.value)}
                        className="h-10 bg-zinc-800/50 border-zinc-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-zinc-400 mb-1.5 block">Seção: Pagamento</Label>
                      <Input
                        value={config.labels.paymentSectionTitle}
                        onChange={(e) => updateLabel("paymentSectionTitle", e.target.value)}
                        className="h-10 bg-zinc-800/50 border-zinc-700 text-white"
                      />
                    </div>

                    <Separator className="bg-zinc-800" />

                    <div>
                      <Label className="text-xs text-zinc-400 mb-1.5 block">Texto do Botão</Label>
                      <Input
                        value={config.labels.buttonText}
                        onChange={(e) => updateLabel("buttonText", e.target.value)}
                        className="h-10 bg-zinc-800/50 border-zinc-700 text-white font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-zinc-400 mb-1.5 block">Rodapé</Label>
                      <Input
                        value={config.labels.footerText}
                        onChange={(e) => updateLabel("footerText", e.target.value)}
                        className="h-10 bg-zinc-800/50 border-zinc-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-zinc-400 mb-1.5 block">Selo de Segurança</Label>
                      <Input
                        value={config.labels.securityBadgeText}
                        onChange={(e) => updateLabel("securityBadgeText", e.target.value)}
                        className="h-10 bg-zinc-800/50 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="p-4 space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-white mb-4">Configurações Gerais</h3>

                  <div className="space-y-4">
                    {/* Logo Toggle */}
                    <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <Image className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Mostrar Logo</p>
                          <p className="text-xs text-zinc-500">Exibir logo no cabeçalho</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.settings.showLogo}
                        onCheckedChange={(v) => updateSetting("showLogo", v)}
                      />
                    </div>

                    {config.settings.showLogo && (
                      <div className="ml-12">
                        <Label className="text-xs text-zinc-400 mb-1.5 block">URL do Logo</Label>
                        <Input
                          value={config.settings.logoUrl}
                          onChange={(e) => updateSetting("logoUrl", e.target.value)}
                          className="h-10 bg-zinc-800/50 border-zinc-700 text-white"
                          placeholder="https://sua-url.com/logo.png"
                        />
                      </div>
                    )}

                    {/* Product Image Toggle */}
                    <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Imagem do Produto</p>
                          <p className="text-xs text-zinc-500">Exibir imagem na sidebar</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.settings.showProductImage}
                        onCheckedChange={(v) => updateSetting("showProductImage", v)}
                      />
                    </div>

                    <Separator className="bg-zinc-800" />

                    {/* Border Radius */}
                    <div>
                      <Label className="text-xs text-zinc-400 mb-3 block">Arredondamento dos Cantos</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          value={config.settings.borderRadius}
                          onChange={(e) => updateSetting("borderRadius", e.target.value)}
                          className="h-10 w-24 bg-zinc-800/50 border-zinc-700 text-white font-mono"
                          placeholder="12px"
                        />
                        <div className="flex gap-2">
                          {["0px", "8px", "12px", "16px", "24px"].map((radius) => (
                            <button
                              key={radius}
                              onClick={() => updateSetting("borderRadius", radius)}
                              className={cn(
                                "w-9 h-9 border-2 transition-all",
                                config.settings.borderRadius === radius
                                  ? "border-primary bg-primary/20"
                                  : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                              )}
                              style={{ borderRadius: radius }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 bg-zinc-950 overflow-auto p-6 flex items-start justify-center">
          <div 
            className={cn(
              "transition-all duration-500 ease-out",
              previewMode === "mobile" ? "w-[390px]" : "w-full max-w-[1000px]"
            )}
          >
            {/* Preview Container with Device Frame */}
            <div className={cn(
              "rounded-2xl overflow-hidden shadow-2xl border",
              previewMode === "mobile"
                ? "border-zinc-700 bg-zinc-900 p-2"
                : "border-zinc-800"
            )}>
              {previewMode === "mobile" && (
                <div className="flex items-center justify-center gap-2 py-2 mb-2">
                  <div className="w-20 h-1 bg-zinc-700 rounded-full" />
                </div>
              )}
              <div className={cn(
                "overflow-hidden",
                previewMode === "mobile" && "rounded-xl"
              )}>
                <TemplateEditorPreview config={config} previewMode={previewMode} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
