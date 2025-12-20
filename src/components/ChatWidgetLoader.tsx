import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatWidget } from "./ChatWidget";

interface TeamAvatar {
  name: string;
  url: string;
}

interface ChatWidgetConfig {
  is_enabled: boolean;
  title: string;
  subtitle: string;
  primary_color: string;
  icon_type: string;
  show_whatsapp_button: boolean;
  whatsapp_number: string | null;
  whatsapp_label: string;
  show_help_button: boolean;
  help_url: string | null;
  help_label: string;
  team_avatars: TeamAvatar[];
  position: string;
  welcome_message: string;
  show_typing_indicator: boolean;
  typing_delay_ms: number;
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
          .from("chat_widget_config")
          .select("*")
          .eq("user_id", userId)
          .eq("is_enabled", true)
          .maybeSingle();

        if (error) {
          console.error("Error fetching chat config:", error);
          return;
        }

        if (data) {
          setConfig({
            is_enabled: data.is_enabled ?? true,
            title: data.title ?? "Atendimento",
            subtitle: data.subtitle ?? "Suporte está online",
            primary_color: data.primary_color ?? "#ef4444",
            icon_type: data.icon_type ?? "chat",
            show_whatsapp_button: data.show_whatsapp_button ?? true,
            whatsapp_number: data.whatsapp_number,
            whatsapp_label: data.whatsapp_label ?? "WhatsApp",
            show_help_button: data.show_help_button ?? true,
            help_url: data.help_url,
            help_label: data.help_label ?? "Ajuda",
            team_avatars: (data.team_avatars as unknown as TeamAvatar[]) ?? [],
            position: data.position ?? "bottom-right",
            welcome_message: data.welcome_message ?? "Olá! 👋 Como posso ajudar você hoje?",
            show_typing_indicator: data.show_typing_indicator ?? true,
            typing_delay_ms: data.typing_delay_ms ?? 1500,
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