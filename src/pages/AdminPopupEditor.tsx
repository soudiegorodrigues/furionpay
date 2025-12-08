import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, Palette, Type, Image, Plus, Trash2, Upload, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ButtonValue {
  label: string;
  value: number;
  icon?: string;
}

interface PopupConfiguration {
  id?: string;
  user_id: string;
  popup_model: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_values: ButtonValue[];
  primary_color: string;
  background_color: string;
  text_color: string;
  logo_url: string;
  font_family: string;
  custom_css: string;
}

const popupModels = [
  { id: "boost", name: "Boost" },
  { id: "simple", name: "Simples" },
  { id: "clean", name: "Clean" },
  { id: "direct", name: "Direto" },
  { id: "hot", name: "Hot" },
  { id: "landing", name: "Landing" },
  { id: "instituto", name: "Instituto" },
];

const fontOptions = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
  { value: "Lato", label: "Lato" },
];

const defaultConfig: Omit<PopupConfiguration, 'user_id' | 'popup_model'> = {
  title: "",
  subtitle: "",
  button_text: "Contribuir",
  button_values: [
    { label: "Opção 1", value: 29.99, icon: "🏠" },
    { label: "Opção 2", value: 14.70, icon: "🍖" },
    { label: "Opção 3", value: 47.99, icon: "💉" },
  ],
  primary_color: "#ef4444",
  background_color: "#ffffff",
  text_color: "#000000",
  logo_url: "",
  font_family: "Inter",
  custom_css: "",
};

const AdminPopupEditor = () => {
  const [searchParams] = useSearchParams();
  const modelId = searchParams.get('model') || 'boost';
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [config, setConfig] = useState<PopupConfiguration | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAdminAuth();

  const modelName = popupModels.find(m => m.id === modelId)?.name || modelId;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    if (isAuthenticated && user) {
      loadConfiguration();
    }
  }, [isAuthenticated, loading, user, modelId]);

  const loadConfiguration = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('popup_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('popup_model', modelId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const buttonValues = data.button_values as unknown as ButtonValue[] | null;
        setConfig({
          ...data,
          button_values: Array.isArray(buttonValues) ? buttonValues : defaultConfig.button_values,
        });
      } else {
        // Create default config
        setConfig({
          user_id: user.id,
          popup_model: modelId,
          ...defaultConfig,
        });
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !user) return;

    setIsSaving(true);
    try {
      const dataToSave = {
        user_id: user.id,
        popup_model: modelId,
        title: config.title,
        subtitle: config.subtitle,
        button_text: config.button_text,
        button_values: JSON.parse(JSON.stringify(config.button_values)),
        primary_color: config.primary_color,
        background_color: config.background_color,
        text_color: config.text_color,
        logo_url: config.logo_url,
        font_family: config.font_family,
        custom_css: config.custom_css,
      };

      const { data: existing } = await supabase
        .from('popup_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('popup_model', modelId)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('popup_configurations')
          .update(dataToSave)
          .eq('id', existing.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('popup_configurations')
          .insert(dataToSave);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Apenas imagens são permitidas",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Tamanho máximo: 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${modelId}-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('popup-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('popup-logos')
        .getPublicUrl(fileName);

      setConfig(prev => prev ? { ...prev, logo_url: publicUrl } : null);

      toast({
        title: "Sucesso",
        description: "Logo enviada com sucesso!",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar logo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const updateButtonValue = (index: number, field: keyof ButtonValue, value: string | number) => {
    if (!config) return;
    const newButtonValues = [...config.button_values];
    newButtonValues[index] = { ...newButtonValues[index], [field]: value };
    setConfig({ ...config, button_values: newButtonValues });
  };

  const addButtonValue = () => {
    if (!config) return;
    setConfig({
      ...config,
      button_values: [
        ...config.button_values,
        { label: `Opção ${config.button_values.length + 1}`, value: 10, icon: "⭐" }
      ]
    });
  };

  const removeButtonValue = (index: number) => {
    if (!config || config.button_values.length <= 1) return;
    const newButtonValues = config.button_values.filter((_, i) => i !== index);
    setConfig({ ...config, button_values: newButtonValues });
  };

  if (loading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!config) return null;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/checkout')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Personalizar {modelName}</h1>
            <p className="text-sm text-muted-foreground">Configure textos, cores e logo do popup</p>
          </div>
        </div>

        {/* Texts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Textos
            </CardTitle>
            <CardDescription>Configure os textos exibidos no popup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Título principal do popup"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Textarea
                value={config.subtitle}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                placeholder="Descrição ou subtítulo"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do Botão</Label>
              <Input
                value={config.button_text}
                onChange={(e) => setConfig({ ...config, button_text: e.target.value })}
                placeholder="Ex: Contribuir, Pagar, Doar"
              />
            </div>
          </CardContent>
        </Card>

        {/* Button Values Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Opções de Valor
            </CardTitle>
            <CardDescription>Configure os botões de valores pré-definidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.button_values.map((btn, index) => (
              <div key={index} className="flex items-end gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <Label>Emoji</Label>
                  <Input
                    value={btn.icon || ""}
                    onChange={(e) => updateButtonValue(index, 'icon', e.target.value)}
                    placeholder="🏠"
                    className="w-20"
                  />
                </div>
                <div className="flex-[2] space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={btn.label}
                    onChange={(e) => updateButtonValue(index, 'label', e.target.value)}
                    placeholder="Nome da opção"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={btn.value}
                    onChange={(e) => updateButtonValue(index, 'value', parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeButtonValue(index)}
                  disabled={config.button_values.length <= 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addButtonValue} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Opção
            </Button>
          </CardContent>
        </Card>

        {/* Colors Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Cores
            </CardTitle>
            <CardDescription>Personalize as cores do popup</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cor Primária</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.primary_color}
                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={config.primary_color}
                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    placeholder="#ef4444"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor de Fundo</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.background_color}
                    onChange={(e) => setConfig({ ...config, background_color: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={config.background_color}
                    onChange={(e) => setConfig({ ...config, background_color: e.target.value })}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor do Texto</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.text_color}
                    onChange={(e) => setConfig({ ...config, text_color: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={config.text_color}
                    onChange={(e) => setConfig({ ...config, text_color: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo & Font Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Logo e Fonte
            </CardTitle>
            <CardDescription>Personalize a identidade visual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {config.logo_url && (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    className="w-16 h-16 object-contain rounded border"
                  />
                )}
                <div className="flex-1">
                  <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {config.logo_url ? "Trocar logo" : "Enviar logo"}
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG ou JPG, máx. 2MB
                  </p>
                </div>
                {config.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfig({ ...config, logo_url: "" })}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select
                value={config.font_family}
                onValueChange={(value) => setConfig({ ...config, font_family: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Custom CSS Section */}
        <Card>
          <CardHeader>
            <CardTitle>CSS Personalizado (Avançado)</CardTitle>
            <CardDescription>Adicione estilos CSS customizados</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.custom_css}
              onChange={(e) => setConfig({ ...config, custom_css: e.target.value })}
              placeholder=".popup-container { ... }"
              rows={4}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3 pb-8">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/checkout')} size="lg">
            Cancelar
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPopupEditor;
