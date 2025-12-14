import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Bell, Volume2, Play, Save, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
};

export function NotificacoesSection() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_settings');
      if (error) throw error;

      if (data && data.length > 0) {
        const settingsMap = new Map(data.map((s: { key: string; value: string }) => [s.key, s.value]));
        setSettings({
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
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
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
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase.rpc('update_user_setting', {
          setting_key: setting.key,
          setting_value: setting.value,
        });
        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const playTestSound = (soundId: string) => {
    const sound = PREDEFINED_SOUNDS.find(s => s.id === soundId);
    if (sound) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(sound.url);
      audioRef.current.volume = settings.volume / 100;
      audioRef.current.play().catch(() => {});
    }
  };

  const testNotification = (type: 'generated' | 'paid') => {
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
      if (type === 'paid') {
        toast.success(title, {
          description: formattedDesc,
          duration: duration || undefined,
        });
      } else {
        toast.info(title, {
          description: formattedDesc,
          duration: duration || undefined,
        });
      }
    }

    if (settings.enableBrowser && Notification.permission === 'granted') {
      new Notification(title, {
        body: formattedDesc,
        icon: '/pwa-192x192.png',
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Notificações
          </CardTitle>
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
              onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
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
                        onChange={(e) => setSettings({ ...settings, pixGeneratedTitle: e.target.value })}
                        placeholder="💰 PIX Gerado!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Input
                        value={settings.pixGeneratedDescription}
                        onChange={(e) => setSettings({ ...settings, pixGeneratedDescription: e.target.value })}
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
                          onValueChange={(value) => setSettings({ ...settings, pixGeneratedSound: value })}
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
                        onValueChange={(value) => setSettings({ ...settings, pixGeneratedDuration: value })}
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
                        onChange={(e) => setSettings({ ...settings, pixPaidTitle: e.target.value })}
                        placeholder="🎉 PIX Pago!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Input
                        value={settings.pixPaidDescription}
                        onChange={(e) => setSettings({ ...settings, pixPaidDescription: e.target.value })}
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
                          onValueChange={(value) => setSettings({ ...settings, pixPaidSound: value })}
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
                        onValueChange={(value) => setSettings({ ...settings, pixPaidDuration: value })}
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
                    onClick={() => testNotification('paid')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Testar Notificação PIX Pago
                  </Button>
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
                      onCheckedChange={(enableToast) => setSettings({ ...settings, enableToast })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificação do navegador</Label>
                      <p className="text-xs text-muted-foreground">Exibe notificação do sistema</p>
                    </div>
                    <Switch
                      checked={settings.enableBrowser}
                      onCheckedChange={(enableBrowser) => setSettings({ ...settings, enableBrowser })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Som de notificação</Label>
                      <p className="text-xs text-muted-foreground">Toca som quando notificar</p>
                    </div>
                    <Switch
                      checked={settings.enableSound}
                      onCheckedChange={(enableSound) => setSettings({ ...settings, enableSound })}
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
                        onValueChange={([volume]) => setSettings({ ...settings, volume })}
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
