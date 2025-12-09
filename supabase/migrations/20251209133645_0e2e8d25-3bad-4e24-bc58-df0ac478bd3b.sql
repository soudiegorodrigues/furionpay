-- Create table for cloakers
CREATE TABLE public.cloakers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  safe_url TEXT NOT NULL,
  offer_url TEXT NOT NULL,
  block_bots BOOLEAN NOT NULL DEFAULT true,
  block_vpn BOOLEAN NOT NULL DEFAULT true,
  verify_device BOOLEAN NOT NULL DEFAULT false,
  country TEXT NOT NULL DEFAULT 'br',
  domain TEXT NOT NULL,
  blocked_devices TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cloakers ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own cloakers" 
ON public.cloakers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cloakers" 
ON public.cloakers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cloakers" 
ON public.cloakers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cloakers" 
ON public.cloakers 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policy for public access to active cloakers (needed for redirect)
CREATE POLICY "Anyone can view active cloakers for redirect" 
ON public.cloakers 
FOR SELECT 
USING (is_active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cloakers_updated_at
BEFORE UPDATE ON public.cloakers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();