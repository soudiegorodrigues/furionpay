import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Bell, Volume2, Play, Save, Upload, Loader2, Trash2, Music, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage, compressionPresets } from "@/lib/imageCompression";

// Pre-defined sounds
const PREDEFINED_SOUNDS = [
  { id: "coin", name: "💰 Moeda", url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" },
  { id: "cash-register", name: "💵 Caixa Registradora", url: "https://assets.mixkit.co/active_storage/sfx/1063/1063-preview.mp3" },
  { id: "money-collect", name: "💸 Dinheiro Coletado", url: "https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3" },
  { id: "cha-ching", name: "🤑 Cha-Ching", url: "https://assets.mixkit.co/active_storage/sfx/1991/1991-preview.mp3" },
  { id: "success", name: "✅ Sucesso", url: "https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3" },
  { id: "celebration", name: "🎉 Celebração", url: "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3" },
  { id: "bell", name: "🔔 Sino", url: "https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3" },
  { id: "notification", name: "📱 Notificação", url: "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3" },
  { id: "custom", name: "🎵 Personalizado", url: "" },
];

const DURATION_OPTIONS = [
  { value: "3000", label: "3 segundos" },
  { value: "5000", label: "5 segundos" },
  { value: "8000", label: "8 segundos" },
  { value: "10000", label: "10 segundos" },
  { value: "0", label: "Permanente" },
];

interface NotificationSettings {
  enabled: boolean;
  enableToast: boolean;
  enableBrowser: boolean;
  enableSound: boolean;
  volume: number;
  pixGeneratedTitle: string;
  pixGeneratedDescription: string;
  pixGeneratedSound: string;
  pixGeneratedDuration: string;
  pixPaidTitle: string;
  pixPaidDescription: string;
  pixPaidSound: string;
  pixPaidDuration: string;
  customSoundUrl: string;
  customSoundName: string;
  customLogoUrl: string;
  customLogoName: string;
  logoSize: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  enableToast: true,
  enableBrowser: true,
  enableSound: true,
  volume: 50,
  pixGeneratedTitle: "💰 PIX Gerado!",
  pixGeneratedDescription: "{nome} - {valor}",
  pixGeneratedSound: "coin",
  pixGeneratedDuration: "5000",
  pixPaidTitle: "🎉 PIX Pago!",
  pixPaidDescription: "{nome} pagou {valor}",
  pixPaidSound: "cash-register",
  pixPaidDuration: "8000",
  customSoundUrl: "",
  customSoundName: "",
  customLogoUrl: "",
  customLogoName: "",
  logoSize: 40,
};

export function NotificacoesSection() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load global notification settings (user_id IS NULL)
      const { data, error } = await supabase.rpc('get_global_notification_settings');
      if (error) throw error;

      if (data && data.length > 0) {
        const settingsMap = new Map(data.map((s: { key: string; value: string }) => [s.key, s.value]));
        const loadedSettings = {
          enabled: settingsMap.get('notification_enabled') !== 'false',
          enableToast: settingsMap.get('notification_enable_toast') !== 'false',
          enableBrowser: settingsMap.get('notification_enable_browser') !== 'false',
          enableSound: settingsMap.get('notification_enable_sound') !== 'false',
          volume: parseInt(settingsMap.get('notification_volume') || '50'),
          pixGeneratedTitle: settingsMap.get('notification_pix_generated_title') || DEFAULT_SETTINGS.pixGeneratedTitle,
          pixGeneratedDescription: settingsMap.get('notification_pix_generated_description') || DEFAULT_SETTINGS.pixGeneratedDescription,
          pixGeneratedSound: settingsMap.get('notification_pix_generated_sound') || DEFAULT_SETTINGS.pixGeneratedSound,
          pixGeneratedDuration: settingsMap.get('notification_pix_generated_duration') || DEFAULT_SETTINGS.pixGeneratedDuration,
          pixPaidTitle: settingsMap.get('notification_pix_paid_title') || DEFAULT_SETTINGS.pixPaidTitle,
          pixPaidDescription: settingsMap.get('notification_pix_paid_description') || DEFAULT_SETTINGS.pixPaidDescription,
          pixPaidSound: settingsMap.get('notification_pix_paid_sound') || DEFAULT_SETTINGS.pixPaidSound,
          pixPaidDuration: settingsMap.get('notification_pix_paid_duration') || DEFAULT_SETTINGS.pixPaidDuration,
          customSoundUrl: settingsMap.get('notification_custom_sound_url') || '',
          customSoundName: settingsMap.get('notification_custom_sound_name') || '',
          customLogoUrl: settingsMap.get('notification_custom_logo_url') || '',
          customLogoName: settingsMap.get('notification_custom_logo_name') || '',
          logoSize: parseInt(settingsMap.get('notification_logo_size') || '40'),
        };
        setSettings(loadedSettings);
        setSavedSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save master toggle immediately
  const handleMasterToggle = async (enabled: boolean) => {
    // Update local state immediately for responsive UI
    setSettings(prev => ({ ...prev, enabled }));
    
    try {
      // Save only the enabled setting to the database
      const { error } = await supabase.rpc('update_global_notification_setting', {
        setting_key: 'notification_enabled',
        setting_value: String(enabled)
      });
      
      if (error) throw error;
      
      // Update saved settings to reflect the change
      setSavedSettings(prev => ({ ...prev, enabled }));
      
      toast.success(enabled ? 'Notificações ativadas' : 'Notificações desativadas');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      // Revert local state on error
      setSettings(prev => ({ ...prev, enabled: !enabled }));
      toast.error('Erro ao salvar configuração');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'notification_enabled', value: String(settings.enabled) },
        { key: 'notification_enable_toast', value: String(settings.enableToast) },
        { key: 'notification_enable_browser', value: String(settings.enableBrowser) },
        { key: 'notification_enable_sound', value: String(settings.enableSound) },
        { key: 'notification_volume', value: String(settings.volume) },
        { key: 'notification_pix_generated_title', value: settings.pixGeneratedTitle },
        { key: 'notification_pix_generated_description', value: settings.pixGeneratedDescription },
        { key: 'notification_pix_generated_sound', value: settings.pixGeneratedSound },
        { key: 'notification_pix_generated_duration', value: settings.pixGeneratedDuration },
        { key: 'notification_pix_paid_title', value: settings.pixPaidTitle },
        { key: 'notification_pix_paid_description', value: settings.pixPaidDescription },
        { key: 'notification_pix_paid_sound', value: settings.pixPaidSound },
        { key: 'notification_pix_paid_duration', value: settings.pixPaidDuration },
        { key: 'notification_custom_sound_url', value: settings.customSoundUrl },
        { key: 'notification_custom_sound_name', value: settings.customSoundName },
        { key: 'notification_custom_logo_url', value: settings.customLogoUrl },
        { key: 'notification_custom_logo_name', value: settings.customLogoName },
        { key: 'notification_logo_size', value: String(settings.logoSize) },
      ];

      // Save as global settings (user_id = NULL) using the new RPC function
      for (const setting of settingsToSave) {
        const { error } = await supabase.rpc('update_global_notification_setting', {
          setting_key: setting.key,
          setting_value: setting.value,
        });
        if (error) throw error;
      }

      setSavedSettings(settings);
      toast.success('Configurações globais salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const playTestSound = (soundId: string) => {
    let soundUrl = '';
    
    if (soundId === 'custom' && settings.customSoundUrl) {
      soundUrl = settings.customSoundUrl;
    } else {
      const sound = PREDEFINED_SOUNDS.find(s => s.id === soundId);
      if (sound) {
        soundUrl = sound.url;
      }
    }
    
    if (soundUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(soundUrl);
      audioRef.current.volume = settings.volume / 100;
      audioRef.current.play().catch(() => {});
    } else if (soundId === 'custom') {
      toast.error('Nenhum som personalizado configurado');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      toast.error('Formato inválido. Use MP3, WAV, OGG ou M4A.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/custom-sound.${fileExt}`;

      // Delete existing file if any
      await supabase.storage
        .from('notification-sounds')
        .remove([fileName]);

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('notification-sounds')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('notification-sounds')
        .getPublicUrl(fileName);

      setSettings(prev => ({
        ...prev,
        customSoundUrl: publicUrl,
        customSoundName: file.name,
        pixPaidSound: 'custom',
      }));

      toast.success('Som personalizado enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error('Erro ao enviar arquivo de áudio');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCustomSound = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete file from storage
      const files = [`${user.id}/custom-sound.mp3`, `${user.id}/custom-sound.wav`, `${user.id}/custom-sound.ogg`, `${user.id}/custom-sound.m4a`];
      await supabase.storage
        .from('notification-sounds')
        .remove(files);

      setSettings(prev => ({
        ...prev,
        customSoundUrl: '',
        customSoundName: '',
        pixPaidSound: prev.pixPaidSound === 'custom' ? 'cash-register' : prev.pixPaidSound,
      }));

      toast.success('Som personalizado removido');
    } catch (error) {
      console.error('Erro ao remover som:', error);
      toast.error('Erro ao remover som');
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Compress image before upload
      const compressedBlob = await compressImage(file, compressionPresets.avatar);
      const fileName = `${user.id}/custom-logo.webp`;

      // Delete existing file if any
      await supabase.storage
        .from('notification-sounds')
        .remove([`${user.id}/custom-logo.png`, `${user.id}/custom-logo.jpg`, `${user.id}/custom-logo.jpeg`, `${user.id}/custom-logo.webp`]);

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('notification-sounds')
        .upload(fileName, compressedBlob, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('notification-sounds')
        .getPublicUrl(fileName);

      setSettings(prev => ({
        ...prev,
        customLogoUrl: `${publicUrl}?t=${Date.now()}`,
        customLogoName: file.name,
      }));

      toast.success('Logo comprimida e enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCustomLogo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete file from storage
      const files = [`${user.id}/custom-logo.png`, `${user.id}/custom-logo.jpg`, `${user.id}/custom-logo.jpeg`, `${user.id}/custom-logo.webp`];
      await supabase.storage
        .from('notification-sounds')
        .remove(files);

      setSettings(prev => ({
        ...prev,
        customLogoUrl: '',
        customLogoName: '',
      }));

      toast.success('Logo personalizada removida');
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      toast.error('Erro ao remover logo');
    }
  };

  const testNotification = async (type: 'generated' | 'paid') => {
    // Check for unsaved changes and auto-save if needed
    if (hasUnsavedChanges) {
      toast.warning('Salvando configurações antes de testar...', { duration: 2000 });
      await saveSettings();
    }

    const title = type === 'generated' ? settings.pixGeneratedTitle : settings.pixPaidTitle;
    const description = type === 'generated' ? settings.pixGeneratedDescription : settings.pixPaidDescription;
    const soundId = type === 'generated' ? settings.pixGeneratedSound : settings.pixPaidSound;
    const duration = parseInt(type === 'generated' ? settings.pixGeneratedDuration : settings.pixPaidDuration);

    // Replace variables with test data
    const formattedDesc = description
      .replace('{nome}', 'João Silva')
      .replace('{valor}', 'R$ 150,00')
      .replace('{produto}', 'Produto Teste');

    if (settings.enableToast) {
      const logoSize = settings.logoSize || 40;
      
      // Set CSS variable for toast logo size
      document.documentElement.style.setProperty('--toast-logo-size', `${logoSize}px`);
      
      const customIcon = settings.customLogoUrl ? (
        <img 
          src={settings.customLogoUrl} 
          alt="Logo" 
          style={{ 
            width: logoSize, 
            height: logoSize, 
            minWidth: logoSize, 
            minHeight: logoSize, 
            borderRadius: Math.round(logoSize * 0.15), 
            objectFit: 'contain' 
          }} 
        />
      ) : undefined;

      if (type === 'paid') {
        toast.success(title, {
          description: formattedDesc,
          duration: duration || undefined,
          icon: customIcon,
        });
      } else {
        toast.info(title, {
          description: formattedDesc,
          duration: duration || undefined,
          icon: customIcon,
        });
      }
    }

    if (settings.enableBrowser && Notification.permission === 'granted') {
      new Notification(title, {
        body: formattedDesc,
        icon: settings.customLogoUrl || '/pwa-192x192.png',
      });
    }

    if (settings.enableSound) {
      playTestSound(soundId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Configurações de Notificações</CardTitle>
              <CardDescription>Personalize alertas de PIX gerados e pagos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div>
              <Label className="text-base font-medium">Notificações ativadas</Label>
              <p className="text-sm text-muted-foreground">Receba alertas de PIX gerados e pagos</p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={handleMasterToggle}
            />
          </div>

          {settings.enabled && (
            <>
              {/* PIX Generated Section */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    PIX Gerado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={settings.pixGeneratedTitle}
                        onChange={(e) => setSettings(prev => ({ ...prev, pixGeneratedTitle: e.target.value }))}
                        placeholder="💰 PIX Gerado!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Input
                        value={settings.pixGeneratedDescription}
                        onChange={(e) => setSettings(prev => ({ ...prev, pixGeneratedDescription: e.target.value }))}
                        placeholder="{nome} - {valor}"
                      />
                      <p className="text-xs text-muted-foreground">
                        Variáveis: {'{nome}'}, {'{valor}'}, {'{produto}'}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Som</Label>
                      <div className="flex gap-2">
                        <Select
                          value={settings.pixGeneratedSound}
                          onValueChange={(value) => setSettings(prev => ({ ...prev, pixGeneratedSound: value }))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PREDEFINED_SOUNDS.map((sound) => (
                              <SelectItem key={sound.id} value={sound.id}>
                                {sound.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => playTestSound(settings.pixGeneratedSound)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duração</Label>
                      <Select
                        value={settings.pixGeneratedDuration}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, pixGeneratedDuration: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => testNotification('generated')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Testar Notificação PIX Gerado
                  </Button>
                </CardContent>
              </Card>

              {/* PIX Paid Section */}
              <Card className="border-2 border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    PIX Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={settings.pixPaidTitle}
                        onChange={(e) => setSettings(prev => ({ ...prev, pixPaidTitle: e.target.value }))}
                        placeholder="🎉 PIX Pago!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Input
                        value={settings.pixPaidDescription}
                        onChange={(e) => setSettings(prev => ({ ...prev, pixPaidDescription: e.target.value }))}
                        placeholder="{nome} pagou {valor}"
                      />
                      <p className="text-xs text-muted-foreground">
                        Variáveis: {'{nome}'}, {'{valor}'}, {'{produto}'}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Som</Label>
                      <div className="flex gap-2">
                        <Select
                          value={settings.pixPaidSound}
                          onValueChange={(value) => setSettings(prev => ({ ...prev, pixPaidSound: value }))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PREDEFINED_SOUNDS.filter(s => s.id !== 'custom' || settings.customSoundUrl).map((sound) => (
                              <SelectItem key={sound.id} value={sound.id} disabled={sound.id === 'custom' && !settings.customSoundUrl}>
                                {sound.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => playTestSound(settings.pixPaidSound)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duração</Label>
                      <Select
                        value={settings.pixPaidDuration}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, pixPaidDuration: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Custom Sound Upload Section */}
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-medium">Som Personalizado</Label>
                    </div>
                    
                    {settings.customSoundUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{settings.customSoundName || 'Som personalizado'}</p>
                          <p className="text-xs text-muted-foreground">Clique em ▶ para ouvir</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => playTestSound('custom')}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleRemoveCustomSound}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,.mp3,.wav,.ogg,.m4a"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Enviar Som Personalizado
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Formatos: MP3, WAV, OGG, M4A • Máx: 5MB
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => testNotification('paid')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Testar Notificação PIX Pago
                  </Button>
                </CardContent>
              </Card>

              {/* Custom Logo Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Logo das Notificações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    A logo aparecerá nas notificações do navegador e nos toasts
                  </p>
                  
                  {settings.customLogoUrl ? (
                    <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-background border flex-shrink-0">
                        <img 
                          src={settings.customLogoUrl} 
                          alt="Logo personalizada" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{settings.customLogoName || 'Logo personalizada'}</p>
                        <p className="text-xs text-muted-foreground">Logo personalizada ativa</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRemoveCustomLogo}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="w-full"
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Enviar Logo Personalizada
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Formatos: PNG, JPG, WEBP • Máx: 2MB
                      </p>
                    </div>
                  )}

                  {/* Logo Size Slider */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Tamanho da Logo no Toast</Label>
                      <span className="text-sm font-medium text-muted-foreground">{settings.logoSize}px</span>
                    </div>
                    <Slider
                      value={[settings.logoSize]}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, logoSize: value[0] }))}
                      min={24}
                      max={64}
                      step={4}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Pequeno (24px)</span>
                      <span>Grande (64px)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Types & Volume */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tipos de Notificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Toast in-app</Label>
                      <p className="text-xs text-muted-foreground">Exibe notificação na tela</p>
                    </div>
                    <Switch
                      checked={settings.enableToast}
                      onCheckedChange={(enableToast) => setSettings(prev => ({ ...prev, enableToast }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificação do navegador</Label>
                      <p className="text-xs text-muted-foreground">Exibe notificação do sistema</p>
                    </div>
                    <Switch
                      checked={settings.enableBrowser}
                      onCheckedChange={(enableBrowser) => setSettings(prev => ({ ...prev, enableBrowser }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Som de notificação</Label>
                      <p className="text-xs text-muted-foreground">Toca som quando notificar</p>
                    </div>
                    <Switch
                      checked={settings.enableSound}
                      onCheckedChange={(enableSound) => setSettings(prev => ({ ...prev, enableSound }))}
                    />
                  </div>

                  {settings.enableSound && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        <Label>Volume: {settings.volume}%</Label>
                      </div>
                      <Slider
                        value={[settings.volume]}
                        onValueChange={([volume]) => setSettings(prev => ({ ...prev, volume }))}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="w-full"
                size="lg"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
