import { useState, useEffect } from "react";
import { MessageCircle, Save, Plus, Trash2, Upload, Eye, Loader2, Pencil, GripVertical, MessageSquare, Clock, HelpCircle, Link, ExternalLink } from "lucide-react";
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

interface AutoMessage {
  id: string;
  content: string;
  delay_ms: number;
  trigger: 'welcome' | 'followup' | 'keyword';
  keywords?: string[];
  order: number;
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
  auto_messages: AutoMessage[];
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
  auto_messages: [],
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("chat_widget_config" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const configData = data as any;
      if (configData) {
        setConfig({
          id: configData.id,
          is_enabled: configData.is_enabled ?? true,
          title: configData.title ?? "Suporte",
          subtitle: configData.subtitle ?? "Estamos online",
          primary_color: configData.primary_color ?? "#ef4444",
          icon_type: configData.icon_type ?? "chat",
          show_whatsapp_button: configData.show_whatsapp_button ?? true,
          whatsapp_number: configData.whatsapp_number ?? "",
          whatsapp_label: configData.whatsapp_label ?? "WhatsApp",
          show_help_button: configData.show_help_button ?? true,
          help_url: configData.help_url ?? "",
          help_label: configData.help_label ?? "Ajuda",
          team_avatars: (configData.team_avatars as TeamAvatar[]) ?? [],
          position: configData.position ?? "bottom-right",
          welcome_message: configData.welcome_message ?? "Olá! 👋 Como posso ajudar você hoje?",
          show_typing_indicator: configData.show_typing_indicator ?? true,
          typing_delay_ms: configData.typing_delay_ms ?? 1500,
          action_cards: Array.isArray(configData.action_cards) ? (configData.action_cards as ActionCard[]) : defaultActionCards,
          greeting_text: configData.greeting_text ?? "Olá! 👋",
          show_bottom_nav: configData.show_bottom_nav ?? true,
          logo_url: configData.logo_url ?? null,
          auto_messages: Array.isArray(configData.auto_messages) ? (configData.auto_messages as AutoMessage[]) : [],
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
        action_cards: JSON.parse(JSON.stringify(config.action_cards)),
        greeting_text: config.greeting_text,
        show_bottom_nav: config.show_bottom_nav,
        logo_url: config.logo_url,
        auto_messages: JSON.parse(JSON.stringify(config.auto_messages)),
      };

      if (config.id) {
        const { error } = await supabase
          .from("chat_widget_config" as any)
          .update(payload)
          .eq("id", config.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("chat_widget_config" as any)
          .insert(payload)
          .select()
          .single();
        
        if (error) throw error;
        setConfig(prev => ({ ...prev, id: (data as any).id }));
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const compressedBlob = await compressImage(file, compressionPresets.avatar);
      const fileName = `logo-${Date.now()}.webp`;

      const { error } = await supabase.storage
        .from("chat-avatars")
        .upload(fileName, compressedBlob, { contentType: "image/webp" });

      if (error) throw error;

      const { data } = supabase.storage.from("chat-avatars").getPublicUrl(fileName);
      setConfig(prev => ({ ...prev, logo_url: data.publicUrl }));
      toast.success("Logo enviado com sucesso!");
    } catch (err) {
      console.error("Error uploading logo:", err);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setConfig(prev => ({ ...prev, logo_url: null }));
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

  // Action Cards management
  const addActionCard = () => {
    if (config.action_cards.length >= 6) {
      toast.error("Máximo de 6 cards permitidos");
      return;
    }
    const newCard: ActionCard = {
      id: crypto.randomUUID(),
      icon: 'message',
      iconBg: 'bg-blue-500',
      title: 'Novo botão',
      subtitle: 'Descrição do botão',
      action: 'message'
    };
    setConfig(prev => ({
      ...prev,
      action_cards: [...prev.action_cards, newCard]
    }));
  };

  const updateActionCard = (id: string, updates: Partial<ActionCard>) => {
    setConfig(prev => ({
      ...prev,
      action_cards: prev.action_cards.map(card => 
        card.id === id ? { ...card, ...updates } : card
      )
    }));
  };

  const removeActionCard = (id: string) => {
    setConfig(prev => ({
      ...prev,
      action_cards: prev.action_cards.filter(card => card.id !== id)
    }));
  };

  // Auto Messages management
  const addAutoMessage = () => {
    if (config.auto_messages.length >= 10) {
      toast.error("Máximo de 10 mensagens automáticas permitidas");
      return;
    }
    const newMessage: AutoMessage = {
      id: crypto.randomUUID(),
      content: '',
      delay_ms: 1500,
      trigger: 'welcome',
      order: config.auto_messages.length,
    };
    setConfig(prev => ({
      ...prev,
      auto_messages: [...prev.auto_messages, newMessage]
    }));
  };

  const updateAutoMessage = (id: string, updates: Partial<AutoMessage>) => {
    setConfig(prev => ({
      ...prev,
      auto_messages: prev.auto_messages.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }));
  };

  const removeAutoMessage = (id: string) => {
    setConfig(prev => ({
      ...prev,
      auto_messages: prev.auto_messages.filter(msg => msg.id !== id).map((msg, index) => ({ ...msg, order: index }))
    }));
  };

  const moveAutoMessage = (id: string, direction: 'up' | 'down') => {
    setConfig(prev => {
      const messages = [...prev.auto_messages];
      const index = messages.findIndex(m => m.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= messages.length) return prev;
      
      [messages[index], messages[newIndex]] = [messages[newIndex], messages[index]];
      return {
        ...prev,
        auto_messages: messages.map((msg, i) => ({ ...msg, order: i }))
      };
    });
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'clock': return <Clock className="h-4 w-4" />;
      case 'help': return <HelpCircle className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'link': return <Link className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const iconOptions = [
    { value: 'message', label: 'Mensagem' },
    { value: 'clock', label: 'Relógio' },
    { value: 'help', label: 'Ajuda' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'link', label: 'Link' },
  ];

  const colorOptions = [
    { value: 'bg-blue-500', label: 'Azul', color: '#3b82f6' },
    { value: 'bg-green-500', label: 'Verde', color: '#22c55e' },
    { value: 'bg-orange-500', label: 'Laranja', color: '#f97316' },
    { value: 'bg-purple-500', label: 'Roxo', color: '#a855f7' },
    { value: 'bg-red-500', label: 'Vermelho', color: '#ef4444' },
    { value: 'bg-pink-500', label: 'Rosa', color: '#ec4899' },
    { value: 'bg-yellow-500', label: 'Amarelo', color: '#eab308' },
    { value: 'bg-cyan-500', label: 'Ciano', color: '#06b6d4' },
  ];

  const actionOptions = [
    { value: 'message', label: 'Enviar mensagem' },
    { value: 'messages', label: 'Ver mensagens' },
    { value: 'help', label: 'Abrir ajuda' },
    { value: 'whatsapp', label: 'Abrir WhatsApp' },
    { value: 'link', label: 'Abrir link externo' },
  ];

  const triggerOptions = [
    { value: 'welcome', label: 'Boas-vindas', description: 'Envia quando o chat abre' },
    { value: 'followup', label: 'Follow-up', description: 'Envia após inatividade' },
    { value: 'keyword', label: 'Palavra-chave', description: 'Envia quando detectar palavras' },
  ];

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

              {/* Logo da Empresa */}
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <Label className="text-base font-medium">Logo da Empresa</Label>
                  <p className="text-sm text-muted-foreground">
                    Aparece no header do chat substituindo o ícone padrão
                  </p>
                </div>
                
                <div className="flex items-start gap-4">
                  {config.logo_url ? (
                    <div className="relative group">
                      <div 
                        className="w-16 h-16 rounded-lg border-2 border-border overflow-hidden flex items-center justify-center bg-background"
                      >
                        <img 
                          src={config.logo_url} 
                          alt="Logo da empresa" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-muted/50"
                      onClick={() => document.getElementById("logo-upload-input")?.click()}
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {config.logo_url 
                        ? "Logo configurado. Clique no X para remover."
                        : "Clique para fazer upload do logo da sua empresa. Formatos: PNG, JPG, SVG."}
                    </p>
                    {!config.logo_url && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById("logo-upload-input")?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Selecionar Logo
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                <input
                  id="logo-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                />
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Botões de Ação</CardTitle>
                  <CardDescription>Configure os cards que aparecem na tela inicial do chat</CardDescription>
                </div>
                <Button onClick={addActionCard} size="sm" className="gap-2" disabled={config.action_cards.length >= 6}>
                  <Plus className="h-4 w-4" />
                  Novo Card
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.action_cards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum card configurado</p>
                  <p className="text-sm">Clique em "Novo Card" para adicionar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {config.action_cards.map((card) => (
                    <div key={card.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center text-white`}>
                            {getIconComponent(card.icon)}
                          </div>
                          <div>
                            <p className="font-medium">{card.title}</p>
                            <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeActionCard(card.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input
                            value={card.title}
                            onChange={(e) => updateActionCard(card.id, { title: e.target.value })}
                            placeholder="Título do botão"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Subtítulo</Label>
                          <Input
                            value={card.subtitle}
                            onChange={(e) => updateActionCard(card.id, { subtitle: e.target.value })}
                            placeholder="Descrição breve"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Ícone</Label>
                          <Select
                            value={card.icon}
                            onValueChange={(value) => updateActionCard(card.id, { icon: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {iconOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Cor do Ícone</Label>
                          <Select
                            value={card.iconBg}
                            onValueChange={(value) => updateActionCard(card.id, { iconBg: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {colorOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded" style={{ backgroundColor: option.color }} />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Ação</Label>
                          <Select
                            value={card.action}
                            onValueChange={(value: ActionCard['action']) => updateActionCard(card.id, { action: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {actionOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {card.action === 'link' && (
                        <div className="space-y-2">
                          <Label>URL do Link</Label>
                          <Input
                            value={card.link || ''}
                            onChange={(e) => updateActionCard(card.id, { link: e.target.value })}
                            placeholder="https://exemplo.com"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {config.action_cards.length}/6 cards configurados
              </p>
            </CardContent>
          </Card>

          {/* WhatsApp Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração WhatsApp</CardTitle>
              <CardDescription>Número usado pelos cards com ação "Abrir WhatsApp"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Habilitar WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Permite usar a ação WhatsApp nos cards</p>
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
            </CardContent>
          </Card>

          {/* Help Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração de Ajuda</CardTitle>
              <CardDescription>URL usada pelos cards com ação "Abrir ajuda"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Habilitar Ajuda</Label>
                  <p className="text-sm text-muted-foreground">Permite usar a ação Ajuda nos cards</p>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4 mt-4">
          {/* Mensagem de Fallback */}
          <Card>
            <CardHeader>
              <CardTitle>Mensagem Padrão</CardTitle>
              <CardDescription>Mensagem de fallback quando não há mensagens automáticas configuradas</CardDescription>
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
                  Esta mensagem é usada quando não há mensagens automáticas configuradas
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">Indicador "Digitando..."</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostra animação de digitação antes das mensagens
                  </p>
                </div>
                <Switch
                  checked={config.show_typing_indicator}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, show_typing_indicator: checked }))}
                />
              </div>

              {config.show_typing_indicator && (
                <div className="space-y-2">
                  <Label>Tempo Base de Digitação (ms)</Label>
                  <Input
                    type="number"
                    value={config.typing_delay_ms}
                    onChange={(e) => setConfig(prev => ({ ...prev, typing_delay_ms: parseInt(e.target.value) || 1500 }))}
                    min={500}
                    max={5000}
                    step={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo padrão em milissegundos (1000ms = 1 segundo)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mensagens Automáticas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mensagens Automáticas</CardTitle>
                  <CardDescription>Configure sequências de mensagens para diferentes situações</CardDescription>
                </div>
                <Button onClick={addAutoMessage} size="sm" className="gap-2" disabled={config.auto_messages.length >= 10}>
                  <Plus className="h-4 w-4" />
                  Nova Mensagem
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.auto_messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma mensagem automática configurada</p>
                  <p className="text-sm">Clique em "Nova Mensagem" para adicionar</p>
                  <p className="text-xs mt-2">A mensagem padrão será usada como fallback</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {config.auto_messages
                    .sort((a, b) => a.order - b.order)
                    .map((msg, index) => (
                    <div key={msg.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => moveAutoMessage(msg.id, 'up')}
                            >
                              <GripVertical className="h-3 w-3 rotate-90" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === config.auto_messages.length - 1}
                              onClick={() => moveAutoMessage(msg.id, 'down')}
                            >
                              <GripVertical className="h-3 w-3 rotate-90" />
                            </Button>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {triggerOptions.find(t => t.value === msg.trigger)?.label || 'Mensagem'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {triggerOptions.find(t => t.value === msg.trigger)?.description}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeAutoMessage(msg.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Conteúdo da Mensagem</Label>
                        <Textarea
                          value={msg.content}
                          onChange={(e) => updateAutoMessage(msg.id, { content: e.target.value })}
                          placeholder="Digite a mensagem automática..."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Gatilho</Label>
                          <Select
                            value={msg.trigger}
                            onValueChange={(value: AutoMessage['trigger']) => updateAutoMessage(msg.id, { trigger: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {triggerOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div>
                                    <span>{option.label}</span>
                                    <span className="text-xs text-muted-foreground ml-2">- {option.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Delay (ms)</Label>
                          <Input
                            type="number"
                            value={msg.delay_ms}
                            onChange={(e) => updateAutoMessage(msg.id, { delay_ms: parseInt(e.target.value) || 1500 })}
                            min={0}
                            max={30000}
                            step={500}
                          />
                          <p className="text-xs text-muted-foreground">
                            Tempo de espera antes de enviar
                          </p>
                        </div>
                      </div>

                      {msg.trigger === 'keyword' && (
                        <div className="space-y-2">
                          <Label>Palavras-chave (separadas por vírgula)</Label>
                          <Input
                            value={msg.keywords?.join(', ') || ''}
                            onChange={(e) => updateAutoMessage(msg.id, { 
                              keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
                            })}
                            placeholder="ajuda, suporte, problema"
                          />
                          <p className="text-xs text-muted-foreground">
                            A mensagem será enviada quando o usuário digitar uma dessas palavras
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {config.auto_messages.length}/10 mensagens configuradas
              </p>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(false)}
              className="absolute -top-12 right-0"
            >
              Fechar Preview
            </Button>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-center text-muted-foreground mb-4 text-sm">Preview do Chat Widget</p>
              <ChatWidget config={config} previewMode={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}