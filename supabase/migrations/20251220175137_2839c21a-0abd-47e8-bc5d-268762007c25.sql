-- Add auto_messages column to chat_widget_config table
ALTER TABLE public.chat_widget_config 
ADD COLUMN IF NOT EXISTS auto_messages jsonb DEFAULT '[]'::jsonb;