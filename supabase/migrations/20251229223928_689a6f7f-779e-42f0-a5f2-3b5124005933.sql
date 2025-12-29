-- 1. Remover a função duplicada que criamos
DROP FUNCTION IF EXISTS public.get_products_paginated(uuid, text, uuid, integer, integer);

-- 2. Atualizar a função ORIGINAL com a correção do filtro de pastas
CREATE OR REPLACE FUNCTION public.get_products_paginated(
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
AS $$
DECLARE
  v_total_count integer;
  v_total_pages integer;
  v_offset integer;
  v_products json;
BEGIN
  v_offset := (p_page - 1) * p_per_page;
  
  SELECT COUNT(*)
  INTO v_total_count
  FROM products p
  WHERE p.user_id = p_user_id
    AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%')
    AND (p_status = 'all' OR 
         (p_status = 'active' AND p.is_active = true) OR 
         (p_status = 'inactive' AND p.is_active = false))
    AND (
      (p_folder_id IS NULL AND p.folder_id IS NULL) OR 
      (p_folder_id IS NOT NULL AND p.folder_id = p_folder_id)
    );
  
  v_total_pages := CEIL(v_total_count::float / p_per_page);
  
  SELECT json_agg(row_to_json(t))
  INTO v_products
  FROM (
    SELECT p.id, p.name, p.description, p.price, 
           p.image_url, p.is_active, p.product_code, 
           p.folder_id, p.created_at, p.updated_at
    FROM products p
    WHERE p.user_id = p_user_id
      AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%')
      AND (p_status = 'all' OR 
           (p_status = 'active' AND p.is_active = true) OR 
           (p_status = 'inactive' AND p.is_active = false))
      AND (
        (p_folder_id IS NULL AND p.folder_id IS NULL) OR 
        (p_folder_id IS NOT NULL AND p.folder_id = p_folder_id)
      )
    ORDER BY p.created_at DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) t;
  
  RETURN json_build_object(
    'products', COALESCE(v_products, '[]'::json),
    'totalCount', v_total_count,
    'totalPages', v_total_pages,
    'currentPage', p_page
  );
END;
$$;