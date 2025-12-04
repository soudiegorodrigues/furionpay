-- Create function for updating timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create chat_flows table
CREATE TABLE public.chat_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_flows
ALTER TABLE public.chat_flows ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_flows
CREATE POLICY "Users can view their own chat flows"
ON public.chat_flows
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own chat flows"
ON public.chat_flows
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat flows"
ON public.chat_flows
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat flows"
ON public.chat_flows
FOR DELETE
USING (user_id = auth.uid());

-- Public read access for active flows (for visitors)
CREATE POLICY "Anyone can view active flows"
ON public.chat_flows
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_chat_flows_updated_at
BEFORE UPDATE ON public.chat_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create chat_blocks table
CREATE TABLE public.chat_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.chat_flows(id) ON DELETE CASCADE,
  block_order INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  delay_ms INTEGER NOT NULL DEFAULT 1000,
  is_typing_indicator BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_blocks
ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_blocks (access through flow ownership)
CREATE POLICY "Users can view blocks of their flows"
ON public.chat_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_flows
    WHERE chat_flows.id = chat_blocks.flow_id
    AND chat_flows.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create blocks for their flows"
ON public.chat_blocks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_flows
    WHERE chat_flows.id = chat_blocks.flow_id
    AND chat_flows.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update blocks of their flows"
ON public.chat_blocks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_flows
    WHERE chat_flows.id = chat_blocks.flow_id
    AND chat_flows.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete blocks of their flows"
ON public.chat_blocks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_flows
    WHERE chat_flows.id = chat_blocks.flow_id
    AND chat_flows.user_id = auth.uid()
  )
);

-- Public read access for blocks of active flows
CREATE POLICY "Anyone can view blocks of active flows"
ON public.chat_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_flows
    WHERE chat_flows.id = chat_blocks.flow_id
    AND chat_flows.is_active = true
  )
);

-- Index for better performance
CREATE INDEX idx_chat_blocks_flow_id ON public.chat_blocks(flow_id);
CREATE INDEX idx_chat_flows_user_id ON public.chat_flows(user_id);