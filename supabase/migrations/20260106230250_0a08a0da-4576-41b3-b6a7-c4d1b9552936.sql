-- Criar função para resolver pixel IDs numéricos a partir dos UUIDs da oferta
CREATE OR REPLACE FUNCTION get_pixel_ids_for_offer(p_offer_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_meta_pixel_ids TEXT[];
  v_user_pixels JSONB;
  v_result TEXT[] := ARRAY[]::TEXT[];
  v_pixel JSONB;
  v_uuid TEXT;
BEGIN
  -- Buscar user_id e meta_pixel_ids da oferta
  SELECT user_id, meta_pixel_ids INTO v_user_id, v_meta_pixel_ids
  FROM checkout_offers WHERE id = p_offer_id;
  
  IF v_meta_pixel_ids IS NULL OR array_length(v_meta_pixel_ids, 1) IS NULL THEN
    RETURN v_result;
  END IF;
  
  -- Buscar pixels do usuário
  SELECT value::jsonb INTO v_user_pixels
  FROM admin_settings 
  WHERE user_id = v_user_id AND key = 'meta_pixels';
  
  IF v_user_pixels IS NULL THEN
    RETURN v_result;
  END IF;
  
  -- Para cada UUID na oferta, encontrar o pixelId numérico
  FOREACH v_uuid IN ARRAY v_meta_pixel_ids LOOP
    FOR v_pixel IN SELECT jsonb_array_elements(v_user_pixels) LOOP
      IF v_pixel->>'id' = v_uuid THEN
        v_result := array_append(v_result, v_pixel->>'pixelId');
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN v_result;
END;
$$;