
-- Create rewards table for storing award/prize definitions
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  threshold_amount NUMERIC NOT NULL DEFAULT 10000,
  delivery_method TEXT NOT NULL DEFAULT 'address',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reward_requests table for tracking user requests
CREATE TABLE public.reward_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  delivery_address TEXT,
  tracking_code TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rewards (admins can CRUD, users can view active)
CREATE POLICY "Admins can manage rewards"
ON public.rewards FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active rewards"
ON public.rewards FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- RLS Policies for reward_requests
CREATE POLICY "Admins can manage all reward requests"
ON public.reward_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own requests"
ON public.reward_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own requests"
ON public.reward_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create storage bucket for reward images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rewards', 'rewards', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for rewards bucket
CREATE POLICY "Admins can upload reward images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rewards' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reward images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'rewards' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reward images"
ON storage.objects FOR DELETE
USING (bucket_id = 'rewards' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view reward images"
ON storage.objects FOR SELECT
USING (bucket_id = 'rewards');

-- Function to get pending reward requests with user info
CREATE OR REPLACE FUNCTION public.get_pending_reward_requests()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  reward_id UUID,
  reward_name TEXT,
  reward_image_url TEXT,
  delivery_address TEXT,
  requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view pending requests';
  END IF;

  RETURN QUERY
  SELECT 
    rr.id,
    rr.user_id,
    u.email::TEXT as user_email,
    rr.reward_id,
    r.name as reward_name,
    r.image_url as reward_image_url,
    rr.delivery_address,
    rr.requested_at
  FROM reward_requests rr
  JOIN auth.users u ON u.id = rr.user_id
  JOIN rewards r ON r.id = rr.reward_id
  WHERE rr.status = 'pending'
  ORDER BY rr.requested_at ASC;
END;
$$;

-- Function to get sent reward requests with user info
CREATE OR REPLACE FUNCTION public.get_sent_reward_requests()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  reward_id UUID,
  reward_name TEXT,
  reward_image_url TEXT,
  delivery_address TEXT,
  tracking_code TEXT,
  requested_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view sent requests';
  END IF;

  RETURN QUERY
  SELECT 
    rr.id,
    rr.user_id,
    u.email::TEXT as user_email,
    rr.reward_id,
    r.name as reward_name,
    r.image_url as reward_image_url,
    rr.delivery_address,
    rr.tracking_code,
    rr.requested_at,
    rr.sent_at
  FROM reward_requests rr
  JOIN auth.users u ON u.id = rr.user_id
  JOIN rewards r ON r.id = rr.reward_id
  WHERE rr.status = 'sent'
  ORDER BY rr.sent_at DESC;
END;
$$;

-- Function to mark reward as sent
CREATE OR REPLACE FUNCTION public.mark_reward_sent(p_request_id UUID, p_tracking_code TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can mark rewards as sent';
  END IF;

  UPDATE reward_requests
  SET 
    status = 'sent',
    sent_at = now(),
    tracking_code = p_tracking_code,
    updated_at = now()
  WHERE id = p_request_id AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_rewards_updated_at
BEFORE UPDATE ON public.rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reward_requests_updated_at
BEFORE UPDATE ON public.reward_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
