import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Show browser notification
const showBrowserNotification = (title: string, body: string, icon?: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/pwa-192x192.png',
      badge: '/pix-icon.png',
      tag: 'furionpay-notification',
    });
  }
};

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const useTransactionNotifications = (userId: string | null) => {
  const hasPermission = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play notification sound
  const playNotificationSound = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioRef.current.volume = 0.5;
    }
    audioRef.current.play().catch(() => {
      // Ignore audio play errors (user interaction required)
    });
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
    if (!userId) return;

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
            const amount = formatCurrency(transaction.amount);
            const donorName = transaction.donor_name || 'Cliente';
            const productName = transaction.product_name || '';
            
            // Show toast notification
            toast.info('💰 PIX Gerado!', {
              description: `${donorName} - ${amount}${productName ? ` (${productName})` : ''}`,
              duration: 5000,
            });
            
            // Show browser notification
            showBrowserNotification(
              '💰 PIX Gerado!',
              `${donorName} gerou um PIX de ${amount}${productName ? ` para ${productName}` : ''}`
            );
            
            // Play sound
            playNotificationSound();
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
            
            const amount = formatCurrency(transaction.amount);
            const donorName = transaction.donor_name || 'Cliente';
            const productName = transaction.product_name || '';
            
            // Show success toast
            toast.success('🎉 PIX Pago!', {
              description: `${donorName} pagou ${amount}${productName ? ` (${productName})` : ''}`,
              duration: 8000,
            });
            
            // Show browser notification
            showBrowserNotification(
              '🎉 PIX Pago!',
              `${donorName} pagou ${amount}${productName ? ` para ${productName}` : ''}`
            );
            
            // Play sound
            playNotificationSound();
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
  }, [userId]);

  return {
    requestPermission: requestNotificationPermission,
    hasPermission: hasPermission.current,
  };
};
