-- Create folders table for organizing products
CREATE TABLE public.product_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to products table
ALTER TABLE public.products ADD COLUMN folder_id UUID REFERENCES public.product_folders(id) ON DELETE SET NULL;

-- Enable RLS on folders
ALTER TABLE public.product_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for folders
CREATE POLICY "Users can view their own folders"
ON public.product_folders FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own folders"
ON public.product_folders FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own folders"
ON public.product_folders FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own folders"
ON public.product_folders FOR DELETE
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_product_folders_updated_at
BEFORE UPDATE ON public.product_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();