CREATE OR REPLACE FUNCTION public.get_api_health_summary()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_object_agg(
    acquirer,
    json_build_object(
      'total_calls_24h', total_calls,
      'success_count', success_count,
      'failure_count', failure_count,
      'retry_count', retry_count,
      'circuit_opens', 0,
      'success_rate', success_rate,
      'avg_response_time', avg_response_time,
      'last_failure', last_failure,
      'is_circuit_open', false
    )
  ) INTO v_result
  FROM (
    SELECT 
      e.acquirer,
      COUNT(*) as total_calls,
      COUNT(*) FILTER (WHERE e.event_type IN ('success', 'webhook_paid', 'webhook_received')) as success_count,
      COUNT(*) FILTER (WHERE e.event_type = 'failure') as failure_count,
      COUNT(*) FILTER (WHERE e.event_type = 'retry') as retry_count,
      MAX(e.created_at) FILTER (WHERE e.event_type = 'failure') as last_failure,
      CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE e.event_type IN ('success', 'webhook_paid', 'webhook_received'))::numeric / COUNT(*)) * 100, 1) ELSE 0 END as success_rate,
      COALESCE(ROUND(AVG(e.response_time_ms) FILTER (WHERE e.response_time_ms IS NOT NULL)), 0) as avg_response_time
    FROM api_monitoring_events e
    WHERE e.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY e.acquirer
  ) stats;
  
  RETURN COALESCE(v_result, '{}'::json);
END;
$function$;