import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  Settings2
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
    buttonText: "Pagar com PIX",
    footerText: "Pagamento processado com segurança",
    securityBadgeText: "Pagamento Seguro",
  },
  settings: {
    showLogo: true,
    logoUrl: "",
    showProductImage: true,
    borderRadius: "8px",
  },
};

export function TemplateEditor({ template, onClose }: TemplateEditorProps) {
  const queryClient = useQueryClient();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
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

  const colorOptions: { key: keyof TemplateConfig["colors"]; label: string }[] = [
    { key: "primary", label: "Cor Primária" },
    { key: "background", label: "Fundo da Página" },
    { key: "cardBackground", label: "Fundo do Card" },
    { key: "text", label: "Texto Principal" },
    { key: "mutedText", label: "Texto Secundário" },
    { key: "border", label: "Bordas" },
    { key: "buttonText", label: "Texto do Botão" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">Editor de Template</h1>
            <p className="text-xs text-muted-foreground">{template.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-0.5">
            <Button
              variant={previewMode === "desktop" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === "mobile" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-80 border-r bg-muted/30 flex flex-col shrink-0">
          <Tabs defaultValue="components" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-10 px-2 shrink-0">
              <TabsTrigger value="components" className="text-xs gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                Componentes
              </TabsTrigger>
              <TabsTrigger value="colors" className="text-xs gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Cores
              </TabsTrigger>
              <TabsTrigger value="labels" className="text-xs gap-1.5">
                <Type className="h-3.5 w-3.5" />
                Textos
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Config
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="components" className="m-0 p-3 space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Ative ou desative os componentes do checkout
                </p>
                {config.components.map((component) => (
                  <Card key={component.id} className="p-0">
                    <div className="flex items-center gap-2 p-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{component.name}</p>
                        <p className="text-[10px] text-muted-foreground">{component.type}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${component.enabled ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => toggleComponent(component.id)}
                      >
                        {component.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="colors" className="m-0 p-3 space-y-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Personalize as cores do template
                </p>
                {colorOptions.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={config.colors[key]}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="w-10 h-8 rounded border cursor-pointer"
                        />
                      </div>
                      <Input
                        value={config.colors[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="h-8 text-xs font-mono flex-1"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="labels" className="m-0 p-3 space-y-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Customize os textos do checkout
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Título do Checkout</Label>
                  <Input
                    value={config.labels.checkoutTitle}
                    onChange={(e) => updateLabel("checkoutTitle", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subtítulo</Label>
                  <Input
                    value={config.labels.checkoutSubtitle}
                    onChange={(e) => updateLabel("checkoutSubtitle", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Opcional"
                  />
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-xs">Seção do Comprador</Label>
                  <Input
                    value={config.labels.buyerSectionTitle}
                    onChange={(e) => updateLabel("buyerSectionTitle", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Seção de Pagamento</Label>
                  <Input
                    value={config.labels.paymentSectionTitle}
                    onChange={(e) => updateLabel("paymentSectionTitle", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-xs">Texto do Botão</Label>
                  <Input
                    value={config.labels.buttonText}
                    onChange={(e) => updateLabel("buttonText", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Texto do Rodapé</Label>
                  <Input
                    value={config.labels.footerText}
                    onChange={(e) => updateLabel("footerText", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Selo de Segurança</Label>
                  <Input
                    value={config.labels.securityBadgeText}
                    onChange={(e) => updateLabel("securityBadgeText", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="m-0 p-3 space-y-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Configurações gerais do template
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Mostrar Logo</Label>
                    <p className="text-[10px] text-muted-foreground">Exibir logo no cabeçalho</p>
                  </div>
                  <Switch
                    checked={config.settings.showLogo}
                    onCheckedChange={(v) => updateSetting("showLogo", v)}
                  />
                </div>
                {config.settings.showLogo && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL do Logo</Label>
                    <Input
                      value={config.settings.logoUrl}
                      onChange={(e) => updateSetting("logoUrl", e.target.value)}
                      className="h-8 text-xs"
                      placeholder="https://..."
                    />
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Imagem do Produto</Label>
                    <p className="text-[10px] text-muted-foreground">Mostrar imagem do produto</p>
                  </div>
                  <Switch
                    checked={config.settings.showProductImage}
                    onCheckedChange={(v) => updateSetting("showProductImage", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Arredondamento (border-radius)</Label>
                  <Input
                    value={config.settings.borderRadius}
                    onChange={(e) => updateSetting("borderRadius", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="8px"
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 bg-muted/50 overflow-auto p-4 flex items-start justify-center">
          <div 
            className={`transition-all duration-300 ${
              previewMode === "mobile" ? "w-[375px]" : "w-full max-w-[900px]"
            }`}
          >
            <TemplateEditorPreview config={config} previewMode={previewMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
