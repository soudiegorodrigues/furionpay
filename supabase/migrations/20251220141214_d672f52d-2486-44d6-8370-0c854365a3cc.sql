-- Create chat widget configuration table
CREATE TABLE public.chat_widget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Visual settings
  is_enabled BOOLEAN DEFAULT true,
  title TEXT DEFAULT 'Atendimento',
  subtitle TEXT DEFAULT 'Suporte está online',
  primary_color TEXT DEFAULT '#ef4444',
  icon_type TEXT DEFAULT 'chat',
  
  -- Action buttons
  show_whatsapp_button BOOLEAN DEFAULT true,
  whatsapp_number TEXT,
  whatsapp_label TEXT DEFAULT 'WhatsApp',
  show_help_button BOOLEAN DEFAULT true,
  help_url TEXT,
  help_label TEXT DEFAULT 'Ajuda',
  
  -- Team avatars (JSON array)
  team_avatars JSONB DEFAULT '[]'::jsonb,
  
  -- Position
  position TEXT DEFAULT 'bottom-right',
  
  -- Automation flow
  automation_flow_id UUID REFERENCES public.chat_flows(id) ON DELETE SET NULL,
  
  -- Welcome message (inline automation)
  welcome_message TEXT DEFAULT 'Olá! 👋 Como posso ajudar você hoje?',
  show_typing_indicator BOOLEAN DEFAULT true,
  typing_delay_ms INTEGER DEFAULT 1500,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.chat_widget_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own chat config"
ON public.chat_widget_config FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chat config"
ON public.chat_widget_config FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat config"
ON public.chat_widget_config FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat config"
ON public.chat_widget_config FOR DELETE
USING (user_id = auth.uid());

-- Public read access for checkout pages (needs user_id from product)
CREATE POLICY "Public can view enabled chat configs"
ON public.chat_widget_config FOR SELECT
USING (is_enabled = true);

-- Trigger for updated_at
CREATE TRIGGER update_chat_widget_config_updated_at
BEFORE UPDATE ON public.chat_widget_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();