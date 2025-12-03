
-- Function to get user revenue ranking
CREATE OR REPLACE FUNCTION public.get_users_revenue_ranking(p_limit integer DEFAULT 5, p_offset integer DEFAULT 0)
RETURNS TABLE(
  user_id uuid,
  user_email text,
  total_generated numeric,
  total_paid numeric,
  total_amount_generated numeric,
  total_amount_paid numeric,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated as admin';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text as user_email,
    COALESCE(COUNT(pt.id), 0)::numeric as total_generated,
    COALESCE(COUNT(pt.id) FILTER (WHERE pt.status = 'paid'), 0)::numeric as total_paid,
    COALESCE(SUM(pt.amount), 0)::numeric as total_amount_generated,
    COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid'), 0)::numeric as total_amount_paid,
    CASE 
      WHEN COUNT(pt.id) > 0 THEN 
        ROUND((COUNT(pt.id) FILTER (WHERE pt.status = 'paid')::numeric / COUNT(pt.id)::numeric) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM auth.users u
  LEFT JOIN public.pix_transactions pt ON pt.user_id = u.id
  GROUP BY u.id, u.email
  ORDER BY COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid'), 0) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to count total users for pagination
CREATE OR REPLACE FUNCTION public.get_users_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated as admin';
  END IF;
  
  RETURN (SELECT COUNT(*)::integer FROM auth.users);
END;
$$;
