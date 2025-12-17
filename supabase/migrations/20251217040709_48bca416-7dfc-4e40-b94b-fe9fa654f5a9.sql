
-- Create new RPC function to get API events by period
CREATE OR REPLACE FUNCTION public.get_api_events_by_period(
  p_days INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  acquirer TEXT,
  event_type TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  retry_attempt INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ame.id,
    ame.acquirer,
    ame.event_type,
    ame.response_time_ms,
    ame.error_message,
    ame.retry_attempt,
    ame.created_at
  FROM api_monitoring_events ame
  WHERE ame.created_at >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY ame.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_api_events_by_period(INTEGER, INTEGER) TO authenticated;
