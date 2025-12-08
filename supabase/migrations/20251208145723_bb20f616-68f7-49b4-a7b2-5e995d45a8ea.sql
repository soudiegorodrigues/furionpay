-- Create table for popup configurations per user
CREATE TABLE public.popup_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  popup_model TEXT NOT NULL,
  
  -- Text configurations
  title TEXT,
  subtitle TEXT,
  button_text TEXT,
  
  -- Value configurations (JSON array for multiple buttons)
  button_values JSONB DEFAULT '[]'::jsonb,
  
  -- Color configurations
  primary_color TEXT DEFAULT '#ef4444',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#000000',
  
  -- Logo configuration
  logo_url TEXT,
  
  -- Font configuration
  font_family TEXT DEFAULT 'Inter',
  
  -- Additional customizations
  custom_css TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one config per popup model per user
  UNIQUE (user_id, popup_model)
);

-- Enable Row Level Security
ALTER TABLE public.popup_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own popup configurations"
ON public.popup_configurations
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own popup configurations"
ON public.popup_configurations
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own popup configurations"
ON public.popup_configurations
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own popup configurations"
ON public.popup_configurations
FOR DELETE
USING (user_id = auth.uid());

-- Policy for public access (for popup rendering without auth)
CREATE POLICY "Anyone can view popup configurations by user_id"
ON public.popup_configurations
FOR SELECT
USING (true);

-- Create storage bucket for popup logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('popup-logos', 'popup-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for popup logos
CREATE POLICY "Users can upload their own popup logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'popup-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own popup logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'popup-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own popup logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'popup-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view popup logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'popup-logos');

-- Create trigger for updating updated_at
CREATE TRIGGER update_popup_configurations_updated_at
BEFORE UPDATE ON public.popup_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();