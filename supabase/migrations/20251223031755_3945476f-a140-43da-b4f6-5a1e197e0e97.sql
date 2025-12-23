-- Create extension for text search if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create optimized indexes for products
CREATE INDEX IF NOT EXISTS idx_products_user_folder ON products(user_id, folder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_active ON products(user_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_created ON products(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Create paginated products RPC function
CREATE OR REPLACE FUNCTION get_products_paginated(
  p_user_id UUID,
  p_page INT DEFAULT 1,
  p_per_page INT DEFAULT 12,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'all',
  p_folder_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offset INT;
  v_total_count BIGINT;
  v_products JSON;
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
  
  -- Get paginated products
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
      p.updated_at
    FROM products p
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
    'total_pages', CEIL(v_total_count::FLOAT / p_per_page)
  );
END;
$$;

-- Create function to get folder counts efficiently
CREATE OR REPLACE FUNCTION get_product_folder_counts(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_counts JSON;
BEGIN
  SELECT json_agg(json_build_object(
    'folder_id', folder_id,
    'count', cnt
  )) INTO v_counts
  FROM (
    SELECT folder_id, COUNT(*) as cnt
    FROM products
    WHERE user_id = p_user_id
    GROUP BY folder_id
  ) t;
  
  RETURN COALESCE(v_counts, '[]'::json);
END;
$$;