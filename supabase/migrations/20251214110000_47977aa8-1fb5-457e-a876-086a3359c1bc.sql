-- Create RPC function to fetch Utmify monitoring events
CREATE OR REPLACE FUNCTION public.get_utmify_events(
  p_period TEXT DEFAULT 'today',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  event_type TEXT,
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_total BIGINT;
BEGIN
  -- Calculate start date based on period
  CASE p_period
    WHEN 'today' THEN
      v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
    WHEN '7days' THEN
      v_start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN
      v_start_date := NOW() - INTERVAL '30 days';
    ELSE
      v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
  END CASE;

  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total
  FROM api_monitoring_events e
  WHERE e.acquirer = 'utmify'
    AND e.created_at >= v_start_date;

  -- Return results with total count
  RETURN QUERY
  SELECT 
    e.id,
    e.event_type,
    e.error_message,
    e.response_time_ms,
    e.created_at,
    v_total as total_count
  FROM api_monitoring_events e
  WHERE e.acquirer = 'utmify'
    AND e.created_at >= v_start_date
  ORDER BY e.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create function for Utmify summary statistics
CREATE OR REPLACE FUNCTION public.get_utmify_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_today TIMESTAMPTZ;
BEGIN
  v_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;

  SELECT json_build_object(
    'today_total', (
      SELECT COUNT(*) FROM api_monitoring_events 
      WHERE acquirer = 'utmify' AND created_at >= v_today
    ),
    'today_success', (
      SELECT COUNT(*) FROM api_monitoring_events 
      WHERE acquirer = 'utmify' AND event_type = 'success' AND created_at >= v_today
    ),
    'today_failure', (
      SELECT COUNT(*) FROM api_monitoring_events 
      WHERE acquirer = 'utmify' AND event_type = 'failure' AND created_at >= v_today
    ),
    'last_event', (
      SELECT created_at FROM api_monitoring_events 
      WHERE acquirer = 'utmify'
      ORDER BY created_at DESC
      LIMIT 1
    ),
    'last_24h_total', (
      SELECT COUNT(*) FROM api_monitoring_events 
      WHERE acquirer = 'utmify' AND created_at >= NOW() - INTERVAL '24 hours'
    ),
    'last_24h_success', (
      SELECT COUNT(*) FROM api_monitoring_events 
      WHERE acquirer = 'utmify' AND event_type = 'success' AND created_at >= NOW() - INTERVAL '24 hours'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;