-- Drop e recriar função get_products_performance para escala 0-100
DROP FUNCTION IF EXISTS public.get_products_performance(UUID);

CREATE OR REPLACE FUNCTION public.get_products_performance(p_user_id UUID)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  total_generated INTEGER,
  total_paid INTEGER,
  revenue NUMERIC,
  conversion_rate NUMERIC,
  performance_score INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_paid INTEGER;
  max_revenue NUMERIC;
BEGIN
  -- Obter máximos para normalização
  SELECT 
    COALESCE(MAX(paid_count), 1),
    COALESCE(MAX(total_revenue), 1)
  INTO max_paid, max_revenue
  FROM (
    SELECT 
      p.id,
      COUNT(CASE WHEN t.status = 'PAID' THEN 1 END) as paid_count,
      COALESCE(SUM(CASE WHEN t.status = 'PAID' THEN t.amount END), 0) as total_revenue
    FROM products p
    LEFT JOIN pix_transactions t ON t.product_name = p.name AND t.user_id = p.user_id
    WHERE p.user_id = p_user_id
    GROUP BY p.id
  ) sub;

  RETURN QUERY
  WITH product_stats AS (
    SELECT 
      p.id as prod_id,
      p.name as prod_name,
      COUNT(t.id)::INTEGER as generated_count,
      COUNT(CASE WHEN t.status = 'PAID' THEN 1 END)::INTEGER as paid_count,
      COALESCE(SUM(CASE WHEN t.status = 'PAID' THEN t.amount END), 0) as revenue
    FROM products p
    LEFT JOIN pix_transactions t ON t.product_name = p.name AND t.user_id = p.user_id
    WHERE p.user_id = p_user_id
    GROUP BY p.id, p.name
  )
  SELECT 
    ps.prod_id,
    ps.prod_name,
    ps.generated_count,
    ps.paid_count,
    ps.revenue,
    CASE WHEN ps.generated_count > 0 
      THEN ROUND((ps.paid_count::NUMERIC / ps.generated_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as conv_rate,
    -- Score: vendas (40%) + conversão (30%) + faturamento (30%) - escala 0-100
    LEAST(100, (
      -- Vendas: normalizado para 40 pontos max
      (CASE WHEN max_paid > 0 THEN (ps.paid_count::NUMERIC / max_paid::NUMERIC) * 40 ELSE 0 END) +
      -- Conversão: até 30 pontos (100% conversão = 30 pts)
      (CASE WHEN ps.generated_count > 0 THEN (ps.paid_count::NUMERIC / ps.generated_count::NUMERIC) * 30 ELSE 0 END) +
      -- Faturamento: normalizado para 30 pontos max
      (CASE WHEN max_revenue > 0 THEN (ps.revenue::NUMERIC / max_revenue::NUMERIC) * 30 ELSE 0 END)
    ))::INTEGER as performance_score
  FROM product_stats ps;
END;
$$;