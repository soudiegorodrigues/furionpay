import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { compressImage, compressionPresets } from "@/lib/imageCompression";
import { CheckoutPreviewMini } from "@/components/checkout/CheckoutPreviewMini";
import {
  Save,
  Upload,
  Image,
  Settings,
  Eye,
  Code,
  Loader2,
  X,
  Monitor,
  Smartphone,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  template_code: string | null;
  layout_config: Record<string, unknown>;
  is_published: boolean;
  is_default: boolean;
  preview_image_url: string | null;
}

interface TemplatesSectionProps {
  template?: Template | null;
  onSave: () => void;
  onCancel: () => void;
}

export function TemplatesSection({ template, onSave, onCancel }: TemplatesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  
  // Form state
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [templateCode, setTemplateCode] = useState(template?.template_code || "");
  const [previewImageUrl, setPreviewImageUrl] = useState(template?.preview_image_url || "");
  const [isPublished, setIsPublished] = useState(template?.is_published || false);
  const [isDefault, setIsDefault] = useState(template?.is_default || false);
  const [layoutConfig, setLayoutConfig] = useState<string>(
    JSON.stringify(template?.layout_config || {}, null, 2)
  );
  
  const [isUploading, setIsUploading] = useState(false);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(layoutConfig);
      } catch {
        throw new Error("JSON de configuração inválido");
      }

      const data = {
        name,
        description: description || null,
        template_code: templateCode || null,
        preview_image_url: previewImageUrl || null,
        is_published: isPublished,
        is_default: isDefault,
        layout_config: parsedConfig,
        updated_at: new Date().toISOString(),
      };

      if (template?.id) {
        // Update
        const { error } = await supabase
          .from("checkout_templates")
          .update(data)
          .eq("id", template.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("checkout_templates").insert(data);
        if (error) throw error;
      }

      // If setting as default, remove default from others
      if (isDefault && template?.id) {
        await supabase
          .from("checkout_templates")
          .update({ is_default: false })
          .neq("id", template.id);
      }
    },
    onSuccess: () => {
      toast.success(template ? "Template atualizado!" : "Template criado!");
      onSave();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar template");
    },
  });

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    setIsUploading(true);
    try {
      const compressedBlob = await compressImage(file, compressionPresets.banner);
      const fileName = `templates/${Date.now()}-preview.webp`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressedBlob, {
          upsert: true,
          contentType: "image/webp",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);

      setPreviewImageUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success("Imagem carregada!");
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  const templateCodeOptions = [
    { value: "padrao", label: "Padrão" },
    { value: "afilia", label: "Clean/Afilia" },
    { value: "vega", label: "Dark/Vega" },
    { value: "multistep", label: "Minimal/Multistep" },
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="gap-1 text-xs">
            <Settings className="h-3 w-3" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-1 text-xs">
            <Code className="h-3 w-3" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1 text-xs">
            <Eye className="h-3 w-3" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-1 text-xs">
            <Image className="h-3 w-3" />
            Status
          </TabsTrigger>
        </TabsList>

        {/* Tab: Geral */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Checkout Moderno"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código do Template</Label>
              <select
                id="code"
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {templateCodeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Define qual componente React será usado
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o template para os usuários..."
              rows={3}
            />
          </div>

          {/* Preview Image Upload */}
          <div className="space-y-2">
            <Label>Imagem de Preview</Label>
            <div className="flex items-start gap-4">
              <div className="w-48 h-28 rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden bg-muted/50 flex items-center justify-center">
                {previewImageUrl ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={previewImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setPreviewImageUrl("")}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Image className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">Sem imagem</p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? "Enviando..." : "Upload Imagem"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recomendado: 800x450px (16:9)
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Layout Config */}
        <TabsContent value="layout" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="layout-config">Configuração de Layout (JSON)</Label>
            <Textarea
              id="layout-config"
              value={layoutConfig}
              onChange={(e) => setLayoutConfig(e.target.value)}
              placeholder="{}"
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Configurações avançadas em formato JSON. Deixe vazio para usar padrões.
            </p>
          </div>
        </TabsContent>

        {/* Tab: Preview */}
        <TabsContent value="preview" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={previewMode === "desktop" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </Button>
            <Button
              variant={previewMode === "mobile" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div
                className={`mx-auto border rounded-lg overflow-hidden bg-background ${
                  previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
                }`}
              >
                <div className="h-[400px] overflow-auto">
                  <CheckoutPreviewMini
                    templateName={templateCode || "padrao"}
                    productName="Produto Exemplo"
                    productPrice={97}
                    primaryColor="#16A34A"
                    previewMode={previewMode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Status */}
        <TabsContent value="status" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Publicado</Label>
                  <p className="text-xs text-muted-foreground">
                    Templates publicados ficam disponíveis para os usuários
                  </p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Template Padrão</Label>
                  <p className="text-xs text-muted-foreground">
                    Será pré-selecionado para novos produtos
                  </p>
                </div>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              </div>

              {/* Status badges */}
              <div className="pt-4 border-t flex gap-2">
                <Badge variant={isPublished ? "default" : "secondary"}>
                  {isPublished ? "Publicado" : "Rascunho"}
                </Badge>
                {isDefault && <Badge className="bg-primary">Padrão</Badge>}
                {templateCode && (
                  <Badge variant="outline">{templateCode}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {template ? "Salvar Alterações" : "Criar Template"}
        </Button>
      </div>
    </div>
  );
}
