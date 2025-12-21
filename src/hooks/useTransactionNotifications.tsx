import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Pre-defined sounds map
const PREDEFINED_SOUNDS: Record<string, string> = {
  "coin": "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  "cash-register": "https://assets.mixkit.co/active_storage/sfx/1063/1063-preview.mp3",
  "money-collect": "https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3",
  "cha-ching": "https://assets.mixkit.co/active_storage/sfx/1991/1991-preview.mp3",
  "success": "https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3",
  "celebration": "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3",
  "bell": "https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3",
  "notification": "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
};

interface NotificationSettings {
  enabled: boolean;
  enableToast: boolean;
  enableBrowser: boolean;
  enableSound: boolean;
  volume: number;
  pixGeneratedTitle: string;
  pixGeneratedDescription: string;
  pixGeneratedSound: string;
  pixGeneratedDuration: number;
  pixPaidTitle: string;
  pixPaidDescription: string;
  pixPaidSound: string;
  pixPaidDuration: number;
  customSoundUrl: string;
  customLogoUrl: string;
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
  pixGeneratedDuration: 5000,
  pixPaidTitle: "🎉 PIX Pago!",
  pixPaidDescription: "{nome} pagou {valor}",
  pixPaidSound: "cash-register",
  pixPaidDuration: 8000,
  customSoundUrl: "",
  customLogoUrl: "",
  logoSize: 40,
};

// Check if browser supports notifications
const supportsNotifications = () => {
  return 'Notification' in window;
};

// Request notification permission
const requestNotificationPermission = async () => {
  if (!supportsNotifications()) return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Calculate net amount (after fees)
const calculateNetAmount = (amount: number, feePercentage: number | null, feeFixed: number | null): number => {
  const percentage = feePercentage ?? 0;
  const fixed = feeFixed ?? 0;
  const feeAmount = (amount * percentage / 100) + fixed;
  return Math.max(0, amount - feeAmount);
};

// Format message with variables
const formatMessage = (template: string, data: { nome: string; valor: string; produto: string }) => {
  return template
    .replace('{nome}', data.nome)
    .replace('{valor}', data.valor)
    .replace('{produto}', data.produto);
};

export const useTransactionNotifications = (userId: string | null) => {
  const hasPermission = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef<NotificationSettings>(DEFAULT_SETTINGS);

  // Keep settingsRef always up to date and sync toast logo size
  useEffect(() => {
    settingsRef.current = settings;
    // Also keep toast logo size CSS var stable
    const size = settings.logoSize || 40;
    document.documentElement.style.setProperty('--toast-logo-size', `${size}px`);
  }, [settings]);

  // Load GLOBAL settings function - all users use the same notification appearance
  const loadSettings = useCallback(async () => {
    try {
      // Load global notification settings (user_id IS NULL)
      const { data, error } = await supabase.rpc('get_global_notification_settings');
      if (error) throw error;

      if (data && data.length > 0) {
        const settingsMap = new Map(data.map((s: { key: string; value: string }) => [s.key, s.value]));
        const newSettings = {
          enabled: settingsMap.get('notification_enabled') !== 'false',
          enableToast: settingsMap.get('notification_enable_toast') !== 'false',
          enableBrowser: settingsMap.get('notification_enable_browser') !== 'false',
          enableSound: settingsMap.get('notification_enable_sound') !== 'false',
          volume: parseInt(settingsMap.get('notification_volume') || '50'),
          pixGeneratedTitle: settingsMap.get('notification_pix_generated_title') || DEFAULT_SETTINGS.pixGeneratedTitle,
          pixGeneratedDescription: settingsMap.get('notification_pix_generated_description') || DEFAULT_SETTINGS.pixGeneratedDescription,
          pixGeneratedSound: settingsMap.get('notification_pix_generated_sound') || DEFAULT_SETTINGS.pixGeneratedSound,
          pixGeneratedDuration: parseInt(settingsMap.get('notification_pix_generated_duration') || '5000'),
          pixPaidTitle: settingsMap.get('notification_pix_paid_title') || DEFAULT_SETTINGS.pixPaidTitle,
          pixPaidDescription: settingsMap.get('notification_pix_paid_description') || DEFAULT_SETTINGS.pixPaidDescription,
          pixPaidSound: settingsMap.get('notification_pix_paid_sound') || DEFAULT_SETTINGS.pixPaidSound,
          pixPaidDuration: parseInt(settingsMap.get('notification_pix_paid_duration') || '8000'),
          customSoundUrl: settingsMap.get('notification_custom_sound_url') || '',
          customLogoUrl: settingsMap.get('notification_custom_logo_url') || '',
          logoSize: parseInt(settingsMap.get('notification_logo_size') || '40'),
        };
        setSettings(newSettings);
        settingsRef.current = newSettings;
        console.log('🔔 Settings globais carregadas:', { customLogoUrl: newSettings.customLogoUrl });
      }
      setSettingsLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar configurações globais de notificação:', error);
      setSettingsLoaded(true);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Subscribe to GLOBAL admin_settings changes for auto-sync (user_id IS NULL)
  useEffect(() => {
    console.log('🔔 Configurando listener de sincronização de settings globais');

    const settingsChannel = supabase
      .channel('global-settings-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
        },
        (payload) => {
          // Only reload if it's a global notification setting
          const record = payload.new as { user_id?: string; key?: string } | null;
          if (record && record.user_id === null && record.key?.startsWith('notification_')) {
            console.log('🔔 Settings globais alteradas, recarregando...', payload);
            loadSettings();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Status do canal de sincronização de settings globais:', status);
      });

    return () => {
      console.log('🔔 Removendo listener de sincronização de settings globais');
      supabase.removeChannel(settingsChannel);
    };
  }, [loadSettings]);

  // Play notification sound - uses settingsRef for current values
  const playNotificationSound = (soundId: string) => {
    const currentSettings = settingsRef.current;
    if (!currentSettings.enableSound) return;
    
    let soundUrl = '';
    
    if (soundId === 'custom' && currentSettings.customSoundUrl) {
      soundUrl = currentSettings.customSoundUrl;
    } else {
      soundUrl = PREDEFINED_SOUNDS[soundId] || PREDEFINED_SOUNDS.coin;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(soundUrl);
    audioRef.current.volume = currentSettings.volume / 100;
    audioRef.current.play().catch(() => {
      // Ignore audio play errors (user interaction required)
    });
  };

  // Show browser notification - uses settingsRef for current values
  const showBrowserNotification = (title: string, body: string) => {
    const currentSettings = settingsRef.current;
    if (!currentSettings.enableBrowser) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: currentSettings.customLogoUrl || '/pwa-192x192.png',
        badge: '/pix-icon.png',
        tag: 'furionpay-notification',
      });
    }
  };

  useEffect(() => {
    // Request permission on mount
    requestNotificationPermission().then((granted) => {
      hasPermission.current = granted;
      if (granted) {
        console.log('Notificações habilitadas');
      }
    });
  }, []);

  useEffect(() => {
    console.log('🔔 useEffect de notificações executado - userId:', userId, 'settingsLoaded:', settingsLoaded, 'enabled:', settings.enabled);
    
    // Wait for settings to be loaded before subscribing
    if (!userId || !settingsLoaded) {
      console.log('🔔 Aguardando userId ou settingsLoaded - userId:', userId, 'settingsLoaded:', settingsLoaded);
      return;
    }
    
    // If notifications are disabled, don't subscribe
    if (!settings.enabled) {
      console.log('🔔 Notificações desativadas, não inscrevendo no canal');
      return;
    }

    console.log('🔔 Configurando listener de notificações para usuário:', userId, 'Logo:', settingsRef.current.customLogoUrl);

    // Subscribe to realtime changes on pix_transactions for this user
    const channel = supabase
      .channel(`transaction-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pix_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 Nova transação detectada:', payload);
          const { new: transaction } = payload;
          
          // Use settingsRef for current values - double check enabled
          const currentSettings = settingsRef.current;
          
          if (transaction && currentSettings.enabled) {
            const netAmount = calculateNetAmount(
              transaction.amount,
              transaction.fee_percentage,
              transaction.fee_fixed
            );
            const data = {
              nome: transaction.donor_name || 'Cliente',
              valor: formatCurrency(netAmount),
              produto: transaction.product_name || '',
            };
            
            const title = currentSettings.pixGeneratedTitle;
            const description = formatMessage(currentSettings.pixGeneratedDescription, data);
            
            console.log('🔔 Exibindo notificação PIX Gerado:', { title, description, logo: currentSettings.customLogoUrl });
            
            // Show toast notification
            if (currentSettings.enableToast) {
              const logoSize = currentSettings.logoSize || 40;
              toast.info(title, {
                description,
                duration: currentSettings.pixGeneratedDuration || undefined,
                icon: currentSettings.customLogoUrl ? (
                  <img
                    src={currentSettings.customLogoUrl}
                    alt="Logo"
                    style={{
                      width: logoSize,
                      height: logoSize,
                      minWidth: logoSize,
                      minHeight: logoSize,
                      borderRadius: Math.round(logoSize * 0.15),
                      objectFit: 'contain',
                    }}
                  />
                ) : undefined,
              });
            }

            // Show browser notification
            showBrowserNotification(title, description);

            // Play sound
            playNotificationSound(currentSettings.pixGeneratedSound);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pix_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 Transação atualizada:', payload);
          const { new: transaction, old: oldTransaction } = payload;
          
          // Use settingsRef for current values - double check enabled
          const currentSettings = settingsRef.current;
          
          // Check if status changed to 'paid'
          if (transaction && oldTransaction && 
              oldTransaction.status !== 'paid' && 
              transaction.status === 'paid' &&
              currentSettings.enabled) {
            
            const netAmount = calculateNetAmount(
              transaction.amount,
              transaction.fee_percentage,
              transaction.fee_fixed
            );
            const data = {
              nome: transaction.donor_name || 'Cliente',
              valor: formatCurrency(netAmount),
              produto: transaction.product_name || '',
            };
            
            const title = currentSettings.pixPaidTitle;
            const description = formatMessage(currentSettings.pixPaidDescription, data);
            
            console.log('🔔 Exibindo notificação PIX Pago:', { title, description, logo: currentSettings.customLogoUrl });
            
            // Show success toast
            if (currentSettings.enableToast) {
              const logoSize = currentSettings.logoSize || 40;
              toast.success(title, {
                description,
                duration: currentSettings.pixPaidDuration || undefined,
                icon: currentSettings.customLogoUrl ? (
                  <img
                    src={currentSettings.customLogoUrl}
                    alt="Logo"
                    style={{
                      width: logoSize,
                      height: logoSize,
                      minWidth: logoSize,
                      minHeight: logoSize,
                      borderRadius: Math.round(logoSize * 0.15),
                      objectFit: 'contain',
                    }}
                  />
                ) : undefined,
              });
            }

            // Show browser notification
            showBrowserNotification(title, description);

            // Play sound
            playNotificationSound(currentSettings.pixPaidSound);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Status do canal de notificações:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal de notificações ativo para usuário:', userId);
        }
      });

    return () => {
      console.log('🔔 Removendo listener de notificações');
      supabase.removeChannel(channel);
    };
  }, [userId, settingsLoaded, settings.enabled]);

  return {
    requestPermission: requestNotificationPermission,
    hasPermission: hasPermission.current,
  };
};
