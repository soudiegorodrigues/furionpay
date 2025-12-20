import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatWidget, ChatWidgetConfig } from "./ChatWidget";

interface ActionCard {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  action: 'message' | 'messages' | 'help' | 'whatsapp' | 'link';
  link?: string;
}

interface TeamAvatar {
  name: string;
  url: string;
}

interface ChatWidgetLoaderProps {
  userId: string;
}

export function ChatWidgetLoader({ userId }: ChatWidgetLoaderProps) {
  const [config, setConfig] = useState<ChatWidgetConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_widget_config" as any)
          .select("*")
          .eq("user_id", userId)
          .eq("is_enabled", true)
          .maybeSingle();

        if (error) {
          console.error("Error fetching chat config:", error);
          return;
        }
        
        // Type guard for the data
        const configData = data as any;

        if (configData) {
          // Parse JSON fields with proper type casting
          const teamAvatars: TeamAvatar[] = Array.isArray(configData.team_avatars) 
            ? (configData.team_avatars as TeamAvatar[])
            : [];
            
          const defaultCards: ActionCard[] = [
            { id: '1', icon: 'message', iconBg: 'bg-blue-500', title: 'Enviar mensagem', subtitle: 'Fale com nossa equipe', action: 'message' },
            { id: '2', icon: 'clock', iconBg: 'bg-orange-500', title: 'Mensagem recente', subtitle: 'Veja suas conversas', action: 'messages' },
            { id: '3', icon: 'help', iconBg: 'bg-purple-500', title: 'Central de ajuda', subtitle: 'Tire suas dúvidas', action: 'help' },
            { id: '4', icon: 'whatsapp', iconBg: 'bg-green-500', title: 'WhatsApp', subtitle: 'Atendimento rápido', action: 'whatsapp' }
          ];
            
          const actionCards: ActionCard[] = Array.isArray(configData.action_cards)
            ? (configData.action_cards as ActionCard[])
            : defaultCards;

          setConfig({
            is_enabled: configData.is_enabled ?? true,
            title: configData.title ?? "Suporte",
            subtitle: configData.subtitle ?? "Estamos online",
            primary_color: configData.primary_color ?? "#ef4444",
            icon_type: configData.icon_type ?? "chat",
            show_whatsapp_button: configData.show_whatsapp_button ?? true,
            whatsapp_number: configData.whatsapp_number,
            whatsapp_label: configData.whatsapp_label ?? "WhatsApp",
            show_help_button: configData.show_help_button ?? true,
            help_url: configData.help_url,
            help_label: configData.help_label ?? "Ajuda",
            team_avatars: teamAvatars,
            position: configData.position ?? "bottom-right",
            welcome_message: configData.welcome_message ?? "Olá! 👋 Como posso ajudar você hoje?",
            show_typing_indicator: configData.show_typing_indicator ?? true,
            typing_delay_ms: configData.typing_delay_ms ?? 1500,
            action_cards: actionCards,
            greeting_text: configData.greeting_text ?? "Olá! 👋",
            show_bottom_nav: configData.show_bottom_nav ?? true,
            logo_url: configData.logo_url ?? null,
          });
        }
      } catch (err) {
        console.error("Error loading chat widget:", err);
      }
    };

    if (userId) {
      fetchConfig();
    }
  }, [userId]);

  if (!config || !config.is_enabled) return null;

  return <ChatWidget config={config} />;
}
