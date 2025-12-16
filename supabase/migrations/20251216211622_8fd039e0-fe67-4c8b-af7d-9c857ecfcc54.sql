-- Create function to get webhook deliveries for a user's API clients
CREATE OR REPLACE FUNCTION public.get_user_webhook_deliveries(p_limit integer DEFAULT 50, p_client_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  api_client_id uuid,
  api_client_name text,
  transaction_id uuid,
  event_type text,
  webhook_url text,
  status text,
  response_status integer,
  response_body text,
  attempts integer,
  created_at timestamp with time zone,
  last_attempt_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    wd.id,
    wd.api_client_id,
    ac.name as api_client_name,
    wd.transaction_id,
    wd.event_type,
    wd.webhook_url,
    wd.status,
    wd.response_status,
    wd.response_body,
    wd.attempts,
    wd.created_at,
    wd.last_attempt_at
  FROM webhook_deliveries wd
  JOIN api_clients ac ON ac.id = wd.api_client_id
  WHERE ac.user_id = auth.uid()
    AND (p_client_id IS NULL OR wd.api_client_id = p_client_id)
  ORDER BY wd.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Create function to get webhook delivery stats
CREATE OR REPLACE FUNCTION public.get_user_webhook_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'total', 0,
      'successful', 0,
      'failed', 0,
      'pending', 0,
      'success_rate', 0
    );
  END IF;

  SELECT json_build_object(
    'total', (
      SELECT COUNT(*) FROM webhook_deliveries wd
      JOIN api_clients ac ON ac.id = wd.api_client_id
      WHERE ac.user_id = auth.uid()
    ),
    'successful', (
      SELECT COUNT(*) FROM webhook_deliveries wd
      JOIN api_clients ac ON ac.id = wd.api_client_id
      WHERE ac.user_id = auth.uid() AND wd.status = 'delivered'
    ),
    'failed', (
      SELECT COUNT(*) FROM webhook_deliveries wd
      JOIN api_clients ac ON ac.id = wd.api_client_id
      WHERE ac.user_id = auth.uid() AND wd.status = 'failed'
    ),
    'pending', (
      SELECT COUNT(*) FROM webhook_deliveries wd
      JOIN api_clients ac ON ac.id = wd.api_client_id
      WHERE ac.user_id = auth.uid() AND wd.status = 'pending'
    ),
    'success_rate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE wd.status = 'delivered')::numeric / COUNT(*)) * 100, 1)
        ELSE 0 
      END
      FROM webhook_deliveries wd
      JOIN api_clients ac ON ac.id = wd.api_client_id
      WHERE ac.user_id = auth.uid()
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Create function to retry a failed webhook delivery
CREATE OR REPLACE FUNCTION public.retry_webhook_delivery(p_delivery_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delivery_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if delivery belongs to user
  SELECT EXISTS(
    SELECT 1 FROM webhook_deliveries wd
    JOIN api_clients ac ON ac.id = wd.api_client_id
    WHERE wd.id = p_delivery_id AND ac.user_id = auth.uid()
  ) INTO v_delivery_exists;

  IF NOT v_delivery_exists THEN
    RAISE EXCEPTION 'Webhook delivery not found';
  END IF;

  -- Reset status to pending for retry
  UPDATE webhook_deliveries
  SET status = 'pending', next_retry_at = now()
  WHERE id = p_delivery_id;

  RETURN true;
END;
$$;