import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Pre-defined sounds map
const PREDEFINED_SOUNDS: Record<string, string> = {
  "coin": "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  "bell": "https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3",
  "notification": "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
  "cash-register": "https://assets.mixkit.co/active_storage/sfx/1063/1063-preview.mp3",
  "success": "https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3",
  "celebration": "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3",
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

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) return;
      
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
            pixGeneratedDuration: parseInt(settingsMap.get('notification_pix_generated_duration') || '5000'),
            pixPaidTitle: settingsMap.get('notification_pix_paid_title') || DEFAULT_SETTINGS.pixPaidTitle,
            pixPaidDescription: settingsMap.get('notification_pix_paid_description') || DEFAULT_SETTINGS.pixPaidDescription,
            pixPaidSound: settingsMap.get('notification_pix_paid_sound') || DEFAULT_SETTINGS.pixPaidSound,
            pixPaidDuration: parseInt(settingsMap.get('notification_pix_paid_duration') || '8000'),
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de notificação:', error);
      }
    };

    loadSettings();
  }, [userId]);

  // Play notification sound
  const playNotificationSound = (soundId: string) => {
    if (!settings.enableSound) return;
    
    const soundUrl = PREDEFINED_SOUNDS[soundId] || PREDEFINED_SOUNDS.coin;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(soundUrl);
    audioRef.current.volume = settings.volume / 100;
    audioRef.current.play().catch(() => {
      // Ignore audio play errors (user interaction required)
    });
  };

  // Show browser notification
  const showBrowserNotification = (title: string, body: string) => {
    if (!settings.enableBrowser) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
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
    if (!userId || !settings.enabled) return;

    console.log('Configurando listener de notificações para usuário:', userId);

    // Subscribe to realtime changes on pix_transactions for this user
    const channel = supabase
      .channel('transaction-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pix_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Nova transação detectada:', payload);
          const { new: transaction } = payload;
          
          if (transaction) {
            const data = {
              nome: transaction.donor_name || 'Cliente',
              valor: formatCurrency(transaction.amount),
              produto: transaction.product_name || '',
            };
            
            const title = settings.pixGeneratedTitle;
            const description = formatMessage(settings.pixGeneratedDescription, data);
            
            // Show toast notification
            if (settings.enableToast) {
              toast.info(title, {
                description,
                duration: settings.pixGeneratedDuration || undefined,
              });
            }
            
            // Show browser notification
            showBrowserNotification(title, description);
            
            // Play sound
            playNotificationSound(settings.pixGeneratedSound);
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
          console.log('Transação atualizada:', payload);
          const { new: transaction, old: oldTransaction } = payload;
          
          // Check if status changed to 'paid'
          if (transaction && oldTransaction && 
              oldTransaction.status !== 'paid' && 
              transaction.status === 'paid') {
            
            const data = {
              nome: transaction.donor_name || 'Cliente',
              valor: formatCurrency(transaction.amount),
              produto: transaction.product_name || '',
            };
            
            const title = settings.pixPaidTitle;
            const description = formatMessage(settings.pixPaidDescription, data);
            
            // Show success toast
            if (settings.enableToast) {
              toast.success(title, {
                description,
                duration: settings.pixPaidDuration || undefined,
              });
            }
            
            // Show browser notification
            showBrowserNotification(title, description);
            
            // Play sound
            playNotificationSound(settings.pixPaidSound);
          }
        }
      )
      .subscribe((status) => {
        console.log('Status do canal de notificações:', status);
      });

    return () => {
      console.log('Removendo listener de notificações');
      supabase.removeChannel(channel);
    };
  }, [userId, settings]);

  return {
    requestPermission: requestNotificationPermission,
    hasPermission: hasPermission.current,
  };
};
