
-- Drop existing function first, then recreate with fixed status comparison
DROP FUNCTION IF EXISTS public.get_products_performance(uuid);

CREATE OR REPLACE FUNCTION public.get_products_performance(p_user_id uuid)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  total_generated bigint,
  total_paid bigint,
  revenue numeric,
  conversion_rate numeric,
  performance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    COUNT(t.id) as total_generated,
    COUNT(CASE WHEN t.status = 'paid' THEN 1 END) as total_paid,
    COALESCE(SUM(CASE WHEN t.status = 'paid' THEN t.amount ELSE 0 END), 0) as revenue,
    CASE 
      WHEN COUNT(t.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN t.status = 'paid' THEN 1 END)::numeric / COUNT(t.id)::numeric) * 100, 2)
      ELSE 0
    END as conversion_rate,
    -- Performance score: combination of paid count and revenue
    ROUND(
      (COUNT(CASE WHEN t.status = 'paid' THEN 1 END) * 10) + 
      (COALESCE(SUM(CASE WHEN t.status = 'paid' THEN t.amount ELSE 0 END), 0) / 100),
      2
    ) as performance_score
  FROM products p
  LEFT JOIN pix_transactions t ON t.product_name = p.name AND t.user_id = p.user_id
  WHERE p.user_id = p_user_id
  GROUP BY p.id, p.name
  ORDER BY performance_score DESC;
END;
$$;
