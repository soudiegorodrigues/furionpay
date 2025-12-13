-- Create table for API monitoring events
CREATE TABLE public.api_monitoring_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acquirer TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'success', 'failure', 'retry', 'circuit_open', 'circuit_close'
  response_time_ms INTEGER,
  error_message TEXT,
  retry_attempt INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_api_monitoring_acquirer_created ON public.api_monitoring_events(acquirer, created_at DESC);
CREATE INDEX idx_api_monitoring_event_type ON public.api_monitoring_events(event_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.api_monitoring_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view monitoring data
CREATE POLICY "Admins can view monitoring events"
ON public.api_monitoring_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Edge functions can insert events (no auth check for inserts via service role)
CREATE POLICY "Service role can insert monitoring events"
ON public.api_monitoring_events
FOR INSERT
WITH CHECK (true);

-- Create function to get API health summary
CREATE OR REPLACE FUNCTION public.get_api_health_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view API health';
  END IF;
  
  SELECT json_build_object(
    'spedpay', (
      SELECT json_build_object(
        'total_calls_24h', COUNT(*),
        'success_count', COUNT(*) FILTER (WHERE event_type = 'success'),
        'failure_count', COUNT(*) FILTER (WHERE event_type = 'failure'),
        'retry_count', COUNT(*) FILTER (WHERE event_type = 'retry'),
        'circuit_opens', COUNT(*) FILTER (WHERE event_type = 'circuit_open'),
        'avg_response_time', ROUND(AVG(response_time_ms) FILTER (WHERE event_type = 'success'))::integer,
        'success_rate', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'success')::numeric / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('success', 'failure')), 0)) * 100, 1) ELSE 0 END,
        'last_failure', MAX(created_at) FILTER (WHERE event_type = 'failure'),
        'is_circuit_open', EXISTS(
          SELECT 1 FROM api_monitoring_events 
          WHERE acquirer = 'spedpay' AND event_type = 'circuit_open' 
          AND created_at > now() - interval '1 minute'
          AND NOT EXISTS(
            SELECT 1 FROM api_monitoring_events 
            WHERE acquirer = 'spedpay' AND event_type = 'circuit_close' 
            AND created_at > (SELECT MAX(created_at) FROM api_monitoring_events WHERE acquirer = 'spedpay' AND event_type = 'circuit_open')
          )
        )
      )
      FROM api_monitoring_events 
      WHERE acquirer = 'spedpay' AND created_at > now() - interval '24 hours'
    ),
    'inter', (
      SELECT json_build_object(
        'total_calls_24h', COUNT(*),
        'success_count', COUNT(*) FILTER (WHERE event_type = 'success'),
        'failure_count', COUNT(*) FILTER (WHERE event_type = 'failure'),
        'retry_count', COUNT(*) FILTER (WHERE event_type = 'retry'),
        'circuit_opens', COUNT(*) FILTER (WHERE event_type = 'circuit_open'),
        'avg_response_time', ROUND(AVG(response_time_ms) FILTER (WHERE event_type = 'success'))::integer,
        'success_rate', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'success')::numeric / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('success', 'failure')), 0)) * 100, 1) ELSE 0 END,
        'last_failure', MAX(created_at) FILTER (WHERE event_type = 'failure'),
        'is_circuit_open', EXISTS(
          SELECT 1 FROM api_monitoring_events 
          WHERE acquirer = 'inter' AND event_type = 'circuit_open' 
          AND created_at > now() - interval '1 minute'
          AND NOT EXISTS(
            SELECT 1 FROM api_monitoring_events 
            WHERE acquirer = 'inter' AND event_type = 'circuit_close' 
            AND created_at > (SELECT MAX(created_at) FROM api_monitoring_events WHERE acquirer = 'inter' AND event_type = 'circuit_open')
          )
        )
      )
      FROM api_monitoring_events 
      WHERE acquirer = 'inter' AND created_at > now() - interval '24 hours'
    ),
    'ativus', (
      SELECT json_build_object(
        'total_calls_24h', COUNT(*),
        'success_count', COUNT(*) FILTER (WHERE event_type = 'success'),
        'failure_count', COUNT(*) FILTER (WHERE event_type = 'failure'),
        'retry_count', COUNT(*) FILTER (WHERE event_type = 'retry'),
        'circuit_opens', COUNT(*) FILTER (WHERE event_type = 'circuit_open'),
        'avg_response_time', ROUND(AVG(response_time_ms) FILTER (WHERE event_type = 'success'))::integer,
        'success_rate', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'success')::numeric / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('success', 'failure')), 0)) * 100, 1) ELSE 0 END,
        'last_failure', MAX(created_at) FILTER (WHERE event_type = 'failure'),
        'is_circuit_open', EXISTS(
          SELECT 1 FROM api_monitoring_events 
          WHERE acquirer = 'ativus' AND event_type = 'circuit_open' 
          AND created_at > now() - interval '1 minute'
          AND NOT EXISTS(
            SELECT 1 FROM api_monitoring_events 
            WHERE acquirer = 'ativus' AND event_type = 'circuit_close' 
            AND created_at > (SELECT MAX(created_at) FROM api_monitoring_events WHERE acquirer = 'ativus' AND event_type = 'circuit_open')
          )
        )
      )
      FROM api_monitoring_events 
      WHERE acquirer = 'ativus' AND created_at > now() - interval '24 hours'
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Create function to get recent events
CREATE OR REPLACE FUNCTION public.get_recent_api_events(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  acquirer text,
  event_type text,
  response_time_ms integer,
  error_message text,
  retry_attempt integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view API events';
  END IF;
  
  RETURN QUERY
  SELECT e.id, e.acquirer, e.event_type, e.response_time_ms, e.error_message, e.retry_attempt, e.created_at
  FROM api_monitoring_events e
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Auto-cleanup old events (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_monitoring_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM api_monitoring_events WHERE created_at < now() - interval '7 days';
END;
$$;