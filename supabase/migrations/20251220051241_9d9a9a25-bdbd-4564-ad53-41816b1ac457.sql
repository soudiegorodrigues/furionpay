-- Update get_api_health_summary to count webhook events as success
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
      'total_calls', total_calls,
      'success_count', success_count,
      'failure_count', failure_count,
      'success_rate', CASE WHEN total_calls > 0 THEN ROUND((success_count::numeric / total_calls) * 100, 1) ELSE 0 END,
      'avg_response_time', avg_response_time,
      'last_event', last_event
    )
  ) INTO v_result
  FROM (
    SELECT 
      e.acquirer,
      COUNT(*) as total_calls,
      COUNT(*) FILTER (WHERE e.event_type IN ('success', 'webhook_paid', 'webhook_received')) as success_count,
      COUNT(*) FILTER (WHERE e.event_type = 'failure') as failure_count,
      COALESCE(ROUND(AVG(e.response_time_ms) FILTER (WHERE e.response_time_ms IS NOT NULL)), 0) as avg_response_time,
      MAX(e.created_at) as last_event
    FROM api_monitoring_events e
    WHERE e.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY e.acquirer
  ) stats;
  
  RETURN COALESCE(v_result, '{}'::json);
END;
$function$;