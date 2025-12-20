CREATE OR REPLACE FUNCTION public.get_api_health_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'valorion', (
      SELECT json_build_object(
        'total_calls_24h', COUNT(*),
        'success_count', COUNT(*) FILTER (WHERE event_type = 'success'),
        'failure_count', COUNT(*) FILTER (WHERE event_type = 'failure'),
        'retry_count', COUNT(*) FILTER (WHERE event_type = 'retry'),
        'circuit_opens', COUNT(*) FILTER (WHERE event_type = 'circuit_open'),
        'avg_response_time', AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL),
        'success_rate', CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
          ELSE NULL 
        END,
        'last_failure', MAX(created_at) FILTER (WHERE event_type = 'failure'),
        'is_circuit_open', EXISTS (
          SELECT 1 FROM api_monitoring_events 
          WHERE acquirer = 'valorion' 
            AND event_type = 'circuit_open' 
            AND created_at > NOW() - INTERVAL '5 minutes'
        )
      )
      FROM api_monitoring_events
      WHERE acquirer = 'valorion'
        AND created_at > NOW() - INTERVAL '24 hours'
    ),
    'inter', (
      SELECT json_build_object(
        'total_calls_24h', COUNT(*),
        'success_count', COUNT(*) FILTER (WHERE event_type = 'success'),
        'failure_count', COUNT(*) FILTER (WHERE event_type = 'failure'),
        'retry_count', COUNT(*) FILTER (WHERE event_type = 'retry'),
        'circuit_opens', COUNT(*) FILTER (WHERE event_type = 'circuit_open'),
        'avg_response_time', AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL),
        'success_rate', CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
          ELSE NULL 
        END,
        'last_failure', MAX(created_at) FILTER (WHERE event_type = 'failure'),
        'is_circuit_open', EXISTS (
          SELECT 1 FROM api_monitoring_events 
          WHERE acquirer = 'inter' 
            AND event_type = 'circuit_open' 
            AND created_at > NOW() - INTERVAL '5 minutes'
        )
      )
      FROM api_monitoring_events
      WHERE acquirer = 'inter'
        AND created_at > NOW() - INTERVAL '24 hours'
    ),
    'ativus', (
      SELECT json_build_object(
        'total_calls_24h', COUNT(*),
        'success_count', COUNT(*) FILTER (WHERE event_type = 'success'),
        'failure_count', COUNT(*) FILTER (WHERE event_type = 'failure'),
        'retry_count', COUNT(*) FILTER (WHERE event_type = 'retry'),
        'circuit_opens', COUNT(*) FILTER (WHERE event_type = 'circuit_open'),
        'avg_response_time', AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL),
        'success_rate', CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
          ELSE NULL 
        END,
        'last_failure', MAX(created_at) FILTER (WHERE event_type = 'failure'),
        'is_circuit_open', EXISTS (
          SELECT 1 FROM api_monitoring_events 
          WHERE acquirer = 'ativus' 
            AND event_type = 'circuit_open' 
            AND created_at > NOW() - INTERVAL '5 minutes'
        )
      )
      FROM api_monitoring_events
      WHERE acquirer = 'ativus'
        AND created_at > NOW() - INTERVAL '24 hours'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;