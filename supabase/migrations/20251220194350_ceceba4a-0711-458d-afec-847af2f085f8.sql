-- Add business hours columns to chat_widget_config
ALTER TABLE public.chat_widget_config
ADD COLUMN IF NOT EXISTS business_hours_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '[
  {"day": 0, "enabled": false, "start": "09:00", "end": "18:00"},
  {"day": 1, "enabled": true, "start": "08:00", "end": "18:00"},
  {"day": 2, "enabled": true, "start": "08:00", "end": "18:00"},
  {"day": 3, "enabled": true, "start": "08:00", "end": "18:00"},
  {"day": 4, "enabled": true, "start": "08:00", "end": "18:00"},
  {"day": 5, "enabled": true, "start": "08:00", "end": "18:00"},
  {"day": 6, "enabled": false, "start": "09:00", "end": "13:00"}
]'::jsonb;