import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTransactionNotifications } from '@/hooks/useTransactionNotifications';

export const TransactionNotificationProvider = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Use the notification hook
  useTransactionNotifications(userId);

  return null;
};
