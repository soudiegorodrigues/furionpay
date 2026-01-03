-- Create optimized function that returns products with performance data in a single query
CREATE OR REPLACE FUNCTION public.get_products_paginated_with_performance(
  p_user_id uuid,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 12,
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_folder_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_total_count bigint;
  v_products json;
BEGIN
  v_offset := (p_page - 1) * p_per_page;
  
  -- Get total count with filters
  SELECT COUNT(*) INTO v_total_count
  FROM products p
  WHERE p.user_id = p_user_id
    AND (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%')
    AND (p_status = 'all' OR 
         (p_status = 'active' AND p.is_active = true) OR 
         (p_status = 'inactive' AND p.is_active = false))
    AND (p_folder_id IS NULL OR p.folder_id = p_folder_id);
  
  -- Get paginated products with performance data
  SELECT json_agg(row_to_json(t)) INTO v_products
  FROM (
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.image_url,
      p.is_active,
      p.folder_id,
      p.product_code,
      p.website_url,
      p.created_at,
      p.updated_at,
      COALESCE(perf.total_paid, 0) as total_paid,
      COALESCE(perf.total_generated, 0) as total_generated,
      COALESCE(perf.conversion_rate, 0) as conversion_rate,
      COALESCE(perf.performance_score, 0) as performance_score
    FROM products p
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(CASE WHEN t.status = 'paid' THEN 1 END) as total_paid,
        COUNT(t.id) as total_generated,
        CASE 
          WHEN COUNT(t.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN t.status = 'paid' THEN 1 END)::numeric / COUNT(t.id)::numeric) * 100, 1)
          ELSE 0
        END as conversion_rate,
        ROUND(
          (COUNT(CASE WHEN t.status = 'paid' THEN 1 END) * 10) + 
          (COALESCE(SUM(CASE WHEN t.status = 'paid' THEN t.amount ELSE 0 END), 0) / 100),
          2
        ) as performance_score
      FROM pix_transactions t
      WHERE t.product_name = p.name AND t.user_id = p.user_id
    ) perf ON true
    WHERE p.user_id = p_user_id
      AND (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%')
      AND (p_status = 'all' OR 
           (p_status = 'active' AND p.is_active = true) OR 
           (p_status = 'inactive' AND p.is_active = false))
      AND (p_folder_id IS NULL OR p.folder_id = p_folder_id)
    ORDER BY p.created_at DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) t;
  
  RETURN json_build_object(
    'products', COALESCE(v_products, '[]'::json),
    'total_count', v_total_count,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL(v_total_count::float / p_per_page)
  );
END;
$$;

-- Add index to improve join performance
CREATE INDEX IF NOT EXISTS idx_pix_transactions_product_lookup 
ON pix_transactions(user_id, product_name, status);