import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationToggleProps {
  userId: string | null;
}

export function NotificationToggle({ userId }: NotificationToggleProps) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Carregar preferência do usuário
  useEffect(() => {
    if (!userId) return;
    
    const loadPreference = async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('user_id', userId)
        .eq('key', 'user_notifications_enabled')
        .maybeSingle();
      
      if (data) {
        setEnabled(data.value !== 'false');
      }
    };
    
    loadPreference();
  }, [userId]);

  // Escutar mudanças em tempo real
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-notification-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'key' in payload.new) {
            const newData = payload.new as { key: string; value: string };
            if (newData.key === 'user_notifications_enabled') {
              setEnabled(newData.value !== 'false');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Alternar preferência
  const toggleNotifications = async () => {
    if (!userId || loading) return;
    
    setLoading(true);
    const newValue = !enabled;
    
    // Primeiro tenta atualizar
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('id')
      .eq('user_id', userId)
      .eq('key', 'user_notifications_enabled')
      .maybeSingle();

    let error;
    if (existing) {
      // Atualiza existente
      const result = await supabase
        .from('admin_settings')
        .update({ value: newValue.toString() })
        .eq('id', existing.id);
      error = result.error;
    } else {
      // Insere novo
      const result = await supabase
        .from('admin_settings')
        .insert({
          user_id: userId,
          key: 'user_notifications_enabled',
          value: newValue.toString(),
        });
      error = result.error;
    }
    
    if (!error) {
      setEnabled(newValue);
      toast.success(newValue ? 'Notificações ativadas' : 'Notificações desativadas');
    } else {
      toast.error('Erro ao salvar preferência');
    }
    
    setLoading(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleNotifications}
          disabled={loading || !userId}
          className="h-9 w-9 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          <span className="sr-only">{enabled ? 'Desativar notificações' : 'Ativar notificações'}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{enabled ? 'Desativar notificações' : 'Ativar notificações'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
