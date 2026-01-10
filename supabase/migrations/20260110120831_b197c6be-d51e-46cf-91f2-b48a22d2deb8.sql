-- Atualizar get_offer_stats para contar pagos por paid_at em vez de created_at
CREATE OR REPLACE FUNCTION public.get_offer_stats(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  offer_id UUID,
  total_generated BIGINT,
  total_paid BIGINT,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    co.id as offer_id,
    -- Gerados: conta por created_at no período
    COUNT(CASE 
      WHEN pt.id IS NOT NULL 
        AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
        AND (p_end_date IS NULL OR pt.created_at < p_end_date)
      THEN 1 
    END)::BIGINT as total_generated,
    -- Pagos: conta por paid_at no período (não mais por created_at)
    COUNT(CASE 
      WHEN pt.status = 'paid' 
        AND (p_start_date IS NULL OR COALESCE(pt.paid_at, pt.created_at) >= p_start_date)
        AND (p_end_date IS NULL OR COALESCE(pt.paid_at, pt.created_at) < p_end_date)
      THEN 1 
    END)::BIGINT as total_paid,
    -- Conversão baseada nos gerados no período que estão pagos
    CASE 
      WHEN COUNT(CASE 
        WHEN pt.id IS NOT NULL 
          AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
          AND (p_end_date IS NULL OR pt.created_at < p_end_date)
        THEN 1 
      END) > 0 
      THEN ROUND(
        (COUNT(CASE 
          WHEN pt.status = 'paid' 
            AND (p_start_date IS NULL OR COALESCE(pt.paid_at, pt.created_at) >= p_start_date)
            AND (p_end_date IS NULL OR COALESCE(pt.paid_at, pt.created_at) < p_end_date)
          THEN 1 
        END)::NUMERIC / 
        COUNT(CASE 
          WHEN pt.id IS NOT NULL 
            AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
            AND (p_end_date IS NULL OR pt.created_at < p_end_date)
          THEN 1 
        END)::NUMERIC) * 100, 2
      )
      ELSE 0 
    END as conversion_rate
  FROM checkout_offers co
  LEFT JOIN pix_transactions pt ON (
    pt.offer_id = co.id 
    OR (pt.offer_id IS NULL AND pt.popup_model = co.popup_model)
  )
  WHERE co.user_id = p_user_id
    AND pt.created_at >= co.created_at
  GROUP BY co.id;
END;
$$;