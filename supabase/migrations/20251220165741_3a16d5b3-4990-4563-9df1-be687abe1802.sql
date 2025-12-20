-- Create chat_widget_config table
CREATE TABLE IF NOT EXISTS public.chat_widget_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  is_enabled boolean DEFAULT true,
  title text DEFAULT 'Suporte',
  subtitle text DEFAULT 'Estamos online',
  primary_color text DEFAULT '#ef4444',
  icon_type text DEFAULT 'chat',
  show_whatsapp_button boolean DEFAULT true,
  whatsapp_number text,
  whatsapp_label text DEFAULT 'WhatsApp',
  show_help_button boolean DEFAULT true,
  help_url text,
  help_label text DEFAULT 'Ajuda',
  team_avatars jsonb DEFAULT '[]'::jsonb,
  position text DEFAULT 'bottom-right',
  welcome_message text DEFAULT 'Olá! 👋 Como posso ajudar você hoje?',
  show_typing_indicator boolean DEFAULT true,
  typing_delay_ms integer DEFAULT 1500,
  action_cards jsonb DEFAULT '[
    {"id": "1", "icon": "message", "iconBg": "bg-blue-500", "title": "Enviar mensagem", "subtitle": "Fale com nossa equipe", "action": "message"},
    {"id": "2", "icon": "clock", "iconBg": "bg-orange-500", "title": "Mensagem recente", "subtitle": "Veja suas conversas", "action": "messages"},
    {"id": "3", "icon": "help", "iconBg": "bg-purple-500", "title": "Central de ajuda", "subtitle": "Tire suas dúvidas", "action": "help"},
    {"id": "4", "icon": "whatsapp", "iconBg": "bg-green-500", "title": "WhatsApp", "subtitle": "Atendimento rápido", "action": "whatsapp"}
  ]'::jsonb,
  greeting_text text DEFAULT 'Olá! 👋',
  show_bottom_nav boolean DEFAULT true,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.chat_widget_config ENABLE ROW LEVEL SECURITY;

-- Users can read their own config
CREATE POLICY "Users can read own chat config" ON public.chat_widget_config
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own config
CREATE POLICY "Users can insert own chat config" ON public.chat_widget_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own config
CREATE POLICY "Users can update own chat config" ON public.chat_widget_config
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own config
CREATE POLICY "Users can delete own chat config" ON public.chat_widget_config
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for chat avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-avatars', 'chat-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for avatar uploads
CREATE POLICY "Users can upload chat avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-avatars' AND auth.role() = 'authenticated');

-- Policy for avatar updates
CREATE POLICY "Users can update chat avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'chat-avatars' AND auth.role() = 'authenticated');

-- Policy for avatar deletes
CREATE POLICY "Users can delete chat avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat-avatars' AND auth.role() = 'authenticated');

-- Policy for public view
CREATE POLICY "Anyone can view chat avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-avatars');