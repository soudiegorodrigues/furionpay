import { useState, useEffect } from "react";
import { MessageCircle, Save, Plus, Trash2, Upload, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatWidget } from "@/components/ChatWidget";
import { compressImage, compressionPresets } from "@/lib/imageCompression";

interface TeamAvatar {
  name: string;
  url: string;
}

interface ActionCard {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  action: 'message' | 'messages' | 'help' | 'whatsapp' | 'link';
  link?: string;
}

interface ChatConfig {
  id?: string;
  is_enabled: boolean;
  title: string;
  subtitle: string;
  primary_color: string;
  icon_type: string;
  show_whatsapp_button: boolean;
  whatsapp_number: string;
  whatsapp_label: string;
  show_help_button: boolean;
  help_url: string;
  help_label: string;
  team_avatars: TeamAvatar[];
  position: string;
  welcome_message: string;
  show_typing_indicator: boolean;
  typing_delay_ms: number;
  // New fields for Proxyseller-style widget
  action_cards: ActionCard[];
  greeting_text: string;
  show_bottom_nav: boolean;
  logo_url: string | null;
}

const defaultActionCards: ActionCard[] = [
  { id: '1', icon: 'message', iconBg: 'bg-blue-500', title: 'Enviar mensagem', subtitle: 'Fale com nossa equipe', action: 'message' },
  { id: '2', icon: 'clock', iconBg: 'bg-orange-500', title: 'Mensagem recente', subtitle: 'Veja suas conversas', action: 'messages' },
  { id: '3', icon: 'help', iconBg: 'bg-purple-500', title: 'Central de ajuda', subtitle: 'Tire suas dúvidas', action: 'help' },
  { id: '4', icon: 'whatsapp', iconBg: 'bg-green-500', title: 'WhatsApp', subtitle: 'Atendimento rápido', action: 'whatsapp' }
];

const defaultConfig: ChatConfig = {
  is_enabled: true,
  title: "Suporte",
  subtitle: "Estamos online",
  primary_color: "#ef4444",
  icon_type: "chat",
  show_whatsapp_button: true,
  whatsapp_number: "",
  whatsapp_label: "WhatsApp",
  show_help_button: true,
  help_url: "",
  help_label: "Ajuda",
  team_avatars: [],
  position: "bottom-right",
  welcome_message: "Olá! 👋 Como posso ajudar você hoje?",
  show_typing_indicator: true,
  typing_delay_ms: 1500,
  action_cards: defaultActionCards,
  greeting_text: "Olá! 👋",
  show_bottom_nav: true,
  logo_url: null,
};

export function ChatConfigSection() {
  const [config, setConfig] = useState<ChatConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newAvatarName, setNewAvatarName] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("chat_widget_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setConfig({
          id: data.id,
          is_enabled: data.is_enabled ?? true,
          title: data.title ?? "Suporte",
          subtitle: data.subtitle ?? "Estamos online",
          primary_color: data.primary_color ?? "#ef4444",
          icon_type: data.icon_type ?? "chat",
          show_whatsapp_button: data.show_whatsapp_button ?? true,
          whatsapp_number: data.whatsapp_number ?? "",
          whatsapp_label: data.whatsapp_label ?? "WhatsApp",
          show_help_button: data.show_help_button ?? true,
          help_url: data.help_url ?? "",
          help_label: data.help_label ?? "Ajuda",
          team_avatars: (data.team_avatars as unknown as TeamAvatar[]) ?? [],
          position: data.position ?? "bottom-right",
          welcome_message: data.welcome_message ?? "Olá! 👋 Como posso ajudar você hoje?",
          show_typing_indicator: data.show_typing_indicator ?? true,
          typing_delay_ms: data.typing_delay_ms ?? 1500,
          action_cards: Array.isArray(data.action_cards) ? (data.action_cards as unknown as ActionCard[]) : defaultActionCards,
          greeting_text: (data as any).greeting_text ?? "Olá! 👋",
          show_bottom_nav: (data as any).show_bottom_nav ?? true,
          logo_url: (data as any).logo_url ?? null,
        });
      }
    } catch (error) {
      console.error("Error fetching chat config:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        user_id: user.id,
        is_enabled: config.is_enabled,
        title: config.title,
        subtitle: config.subtitle,
        primary_color: config.primary_color,
        icon_type: config.icon_type,
        show_whatsapp_button: config.show_whatsapp_button,
        whatsapp_number: config.whatsapp_number || null,
        whatsapp_label: config.whatsapp_label,
        show_help_button: config.show_help_button,
        help_url: config.help_url || null,
        help_label: config.help_label,
        team_avatars: JSON.parse(JSON.stringify(config.team_avatars)),
        position: config.position,
        welcome_message: config.welcome_message,
        show_typing_indicator: config.show_typing_indicator,
        typing_delay_ms: config.typing_delay_ms,
      };

      if (config.id) {
        const { error } = await supabase
          .from("chat_widget_config")
          .update(payload)
          .eq("id", config.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("chat_widget_config")
          .insert(payload)
          .select()
          .single();
        
        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving chat config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const compressedBlob = await compressImage(file, compressionPresets.avatar);
      const fileName = `avatar-${Date.now()}.webp`;

      const { error } = await supabase.storage
        .from("chat-avatars")
        .upload(fileName, compressedBlob, { contentType: "image/webp" });

      if (error) throw error;

      const { data } = supabase.storage.from("chat-avatars").getPublicUrl(fileName);
      setNewAvatarUrl(data.publicUrl);
      setAvatarPreview(data.publicUrl);
      toast.success("Foto enviada com sucesso!");
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const addAvatar = () => {
    if (!newAvatarName.trim()) {
      toast.error("Digite o nome do atendente");
      return;
    }

    setConfig(prev => ({
      ...prev,
      team_avatars: [...prev.team_avatars, { name: newAvatarName, url: newAvatarUrl }]
    }));
    setNewAvatarName("");
    setNewAvatarUrl("");
    setAvatarPreview(null);
  };

  const removeAvatar = (index: number) => {
    setConfig(prev => ({
      ...prev,
      team_avatars: prev.team_avatars.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Chat de Suporte</CardTitle>
                <CardDescription>
                  Configure o widget de suporte interno para os sellers da plataforma
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? "Ocultar Preview" : "Ver Preview"}
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_enabled: checked }))}
            />
            <div>
              <Label className="text-base font-medium">Ativar Chat Widget</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, o chat aparecerá no painel administrativo para os sellers
              </p>
            </div>
          </div>

          <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="actions">Botões</TabsTrigger>
          <TabsTrigger value="automation">Automação</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Visuais</CardTitle>
              <CardDescription>Personalize a aparência do chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Atendimento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input
                    value={config.subtitle}
                    onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Suporte está online"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.primary_color}
                      onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.primary_color}
                      onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#ef4444"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Posição</Label>
                  <Select
                    value={config.position}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, position: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                      <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipe de Atendimento</CardTitle>
              <CardDescription>Adicione os avatares que aparecem no header do chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Atendente</Label>
                  <Input
                    value={newAvatarName}
                    onChange={(e) => setNewAvatarName(e.target.value)}
                    placeholder="Ex: João"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Foto do Atendente (opcional)</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => document.getElementById("avatar-upload-input")?.click()}
                  >
                    {avatarPreview || newAvatarUrl ? (
                      <img
                        src={avatarPreview || newAvatarUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-full mx-auto object-cover"
                      />
                    ) : (
                      <div className="py-2">
                        {isUploadingAvatar ? (
                          <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {isUploadingAvatar ? "Enviando..." : "Clique para upload"}
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="avatar-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addAvatar} disabled={isUploadingAvatar} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {config.team_avatars.length > 0 && (
                <div className="border rounded-lg p-4">
                  <Label className="mb-3 block">Atendentes ({config.team_avatars.length})</Label>
                  <div className="flex flex-wrap gap-3">
                    {config.team_avatars.map((avatar, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 bg-muted px-3 py-2 rounded-full"
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                          style={{ backgroundColor: config.primary_color }}
                        >
                          {avatar.url ? (
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                          ) : (
                            avatar.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-sm">{avatar.name}</span>
                        <button
                          onClick={() => removeAvatar(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Botões de Ação</CardTitle>
              <CardDescription>Configure os botões que aparecem no chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* WhatsApp */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Botão WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">Redireciona para o WhatsApp</p>
                  </div>
                  <Switch
                    checked={config.show_whatsapp_button}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, show_whatsapp_button: checked }))}
                  />
                </div>
                {config.show_whatsapp_button && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número do WhatsApp</Label>
                      <Input
                        value={config.whatsapp_number}
                        onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                        placeholder="5511999999999"
                      />
                      <p className="text-xs text-muted-foreground">Inclua código do país (55 para Brasil)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Texto do Botão</Label>
                      <Input
                        value={config.whatsapp_label}
                        onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_label: e.target.value }))}
                        placeholder="WhatsApp"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Help */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Botão de Ajuda</Label>
                    <p className="text-sm text-muted-foreground">Redireciona para uma página de ajuda</p>
                  </div>
                  <Switch
                    checked={config.show_help_button}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, show_help_button: checked }))}
                  />
                </div>
                {config.show_help_button && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>URL da Página de Ajuda</Label>
                      <Input
                        value={config.help_url}
                        onChange={(e) => setConfig(prev => ({ ...prev, help_url: e.target.value }))}
                        placeholder="https://ajuda.seusite.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Texto do Botão</Label>
                      <Input
                        value={config.help_label}
                        onChange={(e) => setConfig(prev => ({ ...prev, help_label: e.target.value }))}
                        placeholder="Ajuda"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Automação de Mensagens</CardTitle>
              <CardDescription>Configure a mensagem automática de boas-vindas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mensagem de Boas-vindas</Label>
                <Textarea
                  value={config.welcome_message}
                  onChange={(e) => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                  placeholder="Olá! 👋 Como posso ajudar você hoje?"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem aparece automaticamente quando o usuário abre o chat
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">Indicador "Digitando..."</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostra animação de digitação antes da mensagem
                  </p>
                </div>
                <Switch
                  checked={config.show_typing_indicator}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, show_typing_indicator: checked }))}
                />
              </div>

              {config.show_typing_indicator && (
                <div className="space-y-2">
                  <Label>Tempo de Digitação (ms)</Label>
                  <Input
                    type="number"
                    value={config.typing_delay_ms}
                    onChange={(e) => setConfig(prev => ({ ...prev, typing_delay_ms: parseInt(e.target.value) || 1500 }))}
                    min={500}
                    max={5000}
                    step={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo em milissegundos (1000ms = 1 segundo)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(false)}
              className="absolute -top-12 right-0"
            >
              Fechar Preview
            </Button>
            <div className="bg-muted/50 rounded-xl p-8 min-h-[400px] relative">
              <p className="text-center text-muted-foreground mb-4">Preview do Chat Widget</p>
              <ChatWidget config={config} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}