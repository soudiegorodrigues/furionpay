CREATE OR REPLACE FUNCTION public.get_users_revenue_ranking(
  p_limit integer DEFAULT 5, 
  p_offset integer DEFAULT 0,
  p_date_filter text DEFAULT 'all'
)
 RETURNS TABLE(user_id uuid, user_email text, total_generated numeric, total_paid numeric, total_amount_generated numeric, total_amount_paid numeric, conversion_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date timestamptz;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated as admin';
  END IF;
  
  -- Calculate start date based on filter
  v_start_date := CASE p_date_filter
    WHEN 'today' THEN date_trunc('day', now())
    WHEN '7days' THEN date_trunc('day', now()) - interval '7 days'
    WHEN 'month' THEN date_trunc('month', now())
    WHEN 'year' THEN date_trunc('year', now())
    ELSE NULL
  END;
  
  RETURN QUERY
  SELECT * FROM (
    -- Users with transactions
    SELECT 
      u.id as user_id,
      u.email::text as user_email,
      COALESCE(COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date), 0)::numeric as total_generated,
      COALESCE(COUNT(pt.id) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date)), 0)::numeric as total_paid,
      COALESCE(SUM(pt.amount) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date), 0)::numeric as total_amount_generated,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date)), 0)::numeric as total_amount_paid,
      CASE 
        WHEN COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date) > 0 THEN 
          ROUND((COUNT(pt.id) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date))::numeric / 
                 COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date)::numeric) * 100, 1)
        ELSE 0
      END as conversion_rate
    FROM auth.users u
    LEFT JOIN public.pix_transactions pt ON pt.user_id = u.id
    GROUP BY u.id, u.email
    
    UNION ALL
    
    -- Transactions without user (null user_id)
    SELECT 
      NULL::uuid as user_id,
      'Sem usuário'::text as user_email,
      COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date)::numeric as total_generated,
      COUNT(pt.id) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date))::numeric as total_paid,
      COALESCE(SUM(pt.amount) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date), 0)::numeric as total_amount_generated,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date)), 0)::numeric as total_amount_paid,
      CASE 
        WHEN COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date) > 0 THEN 
          ROUND((COUNT(pt.id) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date))::numeric / 
                 COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date)::numeric) * 100, 1)
        ELSE 0
      END as conversion_rate
    FROM public.pix_transactions pt
    WHERE pt.user_id IS NULL
    HAVING COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date) > 0
  ) combined
  ORDER BY combined.total_amount_paid DESC, combined.total_paid DESC, combined.total_generated DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;