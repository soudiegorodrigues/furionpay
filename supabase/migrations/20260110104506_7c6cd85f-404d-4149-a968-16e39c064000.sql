
-- Atualizar função get_user_transactions_paginated para usar paid_at quando filtrar por status 'paid'
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_user_id uuid,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 10,
  p_status_filter text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_offset integer;
  v_total_count integer;
  v_total_amount numeric;
  v_transactions jsonb;
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  -- Verificar se é admin ou o próprio usuário
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    v_user_id := p_user_id;
  ELSIF auth.uid() = p_user_id THEN
    v_user_id := p_user_id;
  ELSE
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Parse dates
  IF p_start_date IS NOT NULL AND p_start_date != '' THEN
    v_start_date := p_start_date::timestamp with time zone;
  END IF;
  
  IF p_end_date IS NOT NULL AND p_end_date != '' THEN
    v_end_date := p_end_date::timestamp with time zone;
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  -- Contar total de registros com a mesma lógica de data
  SELECT COUNT(*), COALESCE(SUM(pt.amount), 0)
  INTO v_total_count, v_total_amount
  FROM pix_transactions pt
  WHERE pt.user_id = v_user_id
    AND (p_status_filter IS NULL OR p_status_filter = '' OR pt.status::text = p_status_filter)
    AND (p_search IS NULL OR p_search = '' OR 
         pt.donor_name ILIKE '%' || p_search || '%' OR 
         pt.donor_email ILIKE '%' || p_search || '%' OR
         pt.donor_cpf ILIKE '%' || p_search || '%' OR
         pt.product_name ILIKE '%' || p_search || '%' OR
         pt.txid ILIKE '%' || p_search || '%')
    -- CORREÇÃO: Usar paid_at quando filtrar por 'paid', senão usar created_at
    AND (
      CASE 
        WHEN p_status_filter = 'paid' THEN
          (v_start_date IS NULL OR pt.paid_at >= v_start_date)
          AND (v_end_date IS NULL OR pt.paid_at < v_end_date)
        ELSE
          (v_start_date IS NULL OR pt.created_at >= v_start_date)
          AND (v_end_date IS NULL OR pt.created_at < v_end_date)
      END
    );

  -- Buscar transações com a mesma lógica
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pt.id,
      'txid', pt.txid,
      'amount', pt.amount,
      'status', pt.status,
      'donor_name', pt.donor_name,
      'donor_email', pt.donor_email,
      'donor_cpf', pt.donor_cpf,
      'donor_phone', pt.donor_phone,
      'product_name', pt.product_name,
      'product_code', pt.product_code,
      'popup_model', pt.popup_model,
      'created_at', pt.created_at,
      'paid_at', pt.paid_at,
      'expired_at', pt.expired_at,
      'pix_code', pt.pix_code,
      'fee_percentage', pt.fee_percentage,
      'fee_fixed', pt.fee_fixed,
      'acquirer', pt.acquirer,
      'is_manual_approval', pt.is_manual_approval,
      'approved_by_email', pt.approved_by_email,
      'utm_data', pt.utm_data,
      'order_bumps', pt.order_bumps,
      'offer_id', pt.offer_id,
      'donor_cep', pt.donor_cep,
      'donor_street', pt.donor_street,
      'donor_number', pt.donor_number,
      'donor_complement', pt.donor_complement,
      'donor_neighborhood', pt.donor_neighborhood,
      'donor_city', pt.donor_city,
      'donor_state', pt.donor_state,
      'donor_birthdate', pt.donor_birthdate
    )
    ORDER BY 
      -- Ordenar por paid_at quando filtrar por 'paid', senão por created_at
      CASE WHEN p_status_filter = 'paid' THEN pt.paid_at ELSE pt.created_at END DESC
  )
  INTO v_transactions
  FROM pix_transactions pt
  WHERE pt.user_id = v_user_id
    AND (p_status_filter IS NULL OR p_status_filter = '' OR pt.status::text = p_status_filter)
    AND (p_search IS NULL OR p_search = '' OR 
         pt.donor_name ILIKE '%' || p_search || '%' OR 
         pt.donor_email ILIKE '%' || p_search || '%' OR
         pt.donor_cpf ILIKE '%' || p_search || '%' OR
         pt.product_name ILIKE '%' || p_search || '%' OR
         pt.txid ILIKE '%' || p_search || '%')
    -- CORREÇÃO: Usar paid_at quando filtrar por 'paid', senão usar created_at
    AND (
      CASE 
        WHEN p_status_filter = 'paid' THEN
          (v_start_date IS NULL OR pt.paid_at >= v_start_date)
          AND (v_end_date IS NULL OR pt.paid_at < v_end_date)
        ELSE
          (v_start_date IS NULL OR pt.created_at >= v_start_date)
          AND (v_end_date IS NULL OR pt.created_at < v_end_date)
      END
    )
  LIMIT p_per_page
  OFFSET v_offset;

  RETURN jsonb_build_object(
    'transactions', COALESCE(v_transactions, '[]'::jsonb),
    'total_count', v_total_count,
    'total_amount', v_total_amount,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL(v_total_count::numeric / p_per_page)
  );
END;
$$;
