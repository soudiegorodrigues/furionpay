
-- Fix the folder filter logic in get_products_paginated_with_performance function
-- When no folder is selected (NULL), show only products WITHOUT a folder
-- When a folder is selected, show only products IN that specific folder

CREATE OR REPLACE FUNCTION public.get_products_paginated_with_performance(
  p_user_id uuid,
  p_search text DEFAULT NULL,
  p_folder_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_total_count integer;
  v_result json;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total count with corrected folder filter
  SELECT COUNT(*)
  INTO v_total_count
  FROM products p
  WHERE p.user_id = p_user_id
    AND p.is_active = true
    AND (
      p_search IS NULL 
      OR p.name ILIKE '%' || p_search || '%'
    )
    AND (
      (p_folder_id IS NULL AND p.folder_id IS NULL) OR 
      (p_folder_id IS NOT NULL AND p.folder_id = p_folder_id)
    );
  
  -- Get paginated products with performance data and corrected folder filter
  SELECT json_build_object(
    'data', COALESCE(json_agg(product_data), '[]'::json),
    'total_count', v_total_count,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total_count::float / p_page_size)
  )
  INTO v_result
  FROM (
    SELECT json_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'price', p.price,
      'image_url', p.image_url,
      'is_active', p.is_active,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'folder_id', p.folder_id,
      'product_code', p.product_code,
      'stats', json_build_object(
        'total_transactions', COALESCE(stats.total_transactions, 0),
        'paid_transactions', COALESCE(stats.paid_transactions, 0),
        'total_revenue', COALESCE(stats.total_revenue, 0),
        'conversion_rate', CASE 
          WHEN COALESCE(stats.total_transactions, 0) > 0 
          THEN ROUND((COALESCE(stats.paid_transactions, 0)::numeric / stats.total_transactions) * 100, 1)
          ELSE 0 
        END
      )
    ) as product_data
    FROM products p
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_transactions,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_revenue
      FROM pix_transactions pt
      WHERE pt.product_name = p.name
        AND pt.user_id = p_user_id
    ) stats ON true
    WHERE p.user_id = p_user_id
      AND p.is_active = true
      AND (
        p_search IS NULL 
        OR p.name ILIKE '%' || p_search || '%'
      )
      AND (
        (p_folder_id IS NULL AND p.folder_id IS NULL) OR 
        (p_folder_id IS NOT NULL AND p.folder_id = p_folder_id)
      )
    ORDER BY p.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) subquery;
  
  RETURN v_result;
END;
$$;
