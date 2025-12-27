-- Função para calcular performance dos produtos baseado em vendas
CREATE OR REPLACE FUNCTION get_products_performance(p_user_id UUID)
RETURNS TABLE (
  product_id UUID,
  total_paid BIGINT,
  total_generated BIGINT,
  conversion_rate NUMERIC,
  total_revenue NUMERIC,
  performance_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_paid BIGINT;
  max_revenue NUMERIC;
BEGIN
  -- Primeiro calcular os máximos para normalização
  SELECT 
    COALESCE(MAX(paid_count), 1),
    COALESCE(MAX(revenue), 1)
  INTO max_paid, max_revenue
  FROM (
    SELECT 
      product_name,
      COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as revenue
    FROM pix_transactions
    WHERE user_id = p_user_id
    GROUP BY product_name
  ) stats;

  RETURN QUERY
  WITH product_stats AS (
    SELECT 
      p.id as prod_id,
      COUNT(pt.id) FILTER (WHERE pt.status = 'paid') as paid_count,
      COUNT(pt.id) as generated_count,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid'), 0) as revenue
    FROM products p
    LEFT JOIN pix_transactions pt ON pt.product_name = p.name AND pt.user_id = p.user_id
    WHERE p.user_id = p_user_id
    GROUP BY p.id
  )
  SELECT 
    ps.prod_id as product_id,
    ps.paid_count::BIGINT as total_paid,
    ps.generated_count::BIGINT as total_generated,
    CASE 
      WHEN ps.generated_count > 0 THEN ROUND((ps.paid_count::NUMERIC / ps.generated_count::NUMERIC) * 100, 1)
      ELSE 0
    END as conversion_rate,
    ps.revenue as total_revenue,
    -- Score: vendas (40%) + conversão (30%) + faturamento (30%)
    LEAST(1000, (
      -- Vendas: normalizado para 400 pontos max
      (CASE WHEN max_paid > 0 THEN (ps.paid_count::NUMERIC / max_paid::NUMERIC) * 400 ELSE 0 END) +
      -- Conversão: até 300 pontos (100% conversão = 300 pts)
      (CASE WHEN ps.generated_count > 0 THEN (ps.paid_count::NUMERIC / ps.generated_count::NUMERIC) * 300 ELSE 0 END) +
      -- Faturamento: normalizado para 300 pontos max
      (CASE WHEN max_revenue > 0 THEN (ps.revenue::NUMERIC / max_revenue::NUMERIC) * 300 ELSE 0 END)
    ))::INTEGER as performance_score
  FROM product_stats ps;
END;
$$;