-- Add new columns for Proxyseller-style chat widget
ALTER TABLE chat_widget_config 
ADD COLUMN IF NOT EXISTS action_cards jsonb DEFAULT '[
  {"id": "1", "icon": "message", "iconBg": "bg-blue-500", "title": "Enviar mensagem", "subtitle": "Fale com nossa equipe", "action": "message"},
  {"id": "2", "icon": "clock", "iconBg": "bg-orange-500", "title": "Mensagem recente", "subtitle": "Veja suas conversas", "action": "messages"},
  {"id": "3", "icon": "help", "iconBg": "bg-purple-500", "title": "Central de ajuda", "subtitle": "Tire suas dúvidas", "action": "help"},
  {"id": "4", "icon": "whatsapp", "iconBg": "bg-green-500", "title": "WhatsApp", "subtitle": "Atendimento rápido", "action": "whatsapp"}
]'::jsonb,
ADD COLUMN IF NOT EXISTS greeting_text text DEFAULT 'Olá! 👋',
ADD COLUMN IF NOT EXISTS show_bottom_nav boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS logo_url text;