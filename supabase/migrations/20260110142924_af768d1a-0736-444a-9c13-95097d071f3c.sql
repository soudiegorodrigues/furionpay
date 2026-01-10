-- Função para expirar PIX antigos em lotes (batch) para não sobrecarregar o sistema
-- Cada update vai disparar o trigger utmify-sync automaticamente
CREATE OR REPLACE FUNCTION public.expire_old_pix_transactions_batch(batch_size INTEGER DEFAULT 200)
RETURNS TABLE(expired_count INTEGER, remaining_count BIGINT) AS $$
DECLARE
  v_expired_count INTEGER;
  v_remaining_count BIGINT;
BEGIN
  -- Atualiza PIX em lote (mais antigos primeiro)
  WITH expired_pix AS (
    SELECT id 
    FROM public.pix_transactions
    WHERE status = 'generated'
      AND created_at < NOW() - INTERVAL '24 hours'
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.pix_transactions pt
  SET 
    status = 'expired',
    expired_at = NOW()
  FROM expired_pix ep
  WHERE pt.id = ep.id;
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Conta quantos ainda restam para expirar
  SELECT COUNT(*) INTO v_remaining_count
  FROM public.pix_transactions
  WHERE status = 'generated'
    AND created_at < NOW() - INTERVAL '24 hours';
  
  RAISE LOG '[AUTO-EXPIRE] Expirados % PIX, restam % pendentes antigos', v_expired_count, v_remaining_count;
  
  expired_count := v_expired_count;
  remaining_count := v_remaining_count;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função wrapper para o cron (retorna void)
CREATE OR REPLACE FUNCTION public.auto_expire_pix_cron()
RETURNS void AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM public.expire_old_pix_transactions_batch(200);
  RAISE LOG '[CRON-EXPIRE] Batch executado: % expirados, % restantes', result.expired_count, result.remaining_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar cron job para rodar a cada 10 minutos
-- Isso vai "drenar" o backlog aos poucos sem sobrecarregar
SELECT cron.schedule(
  'auto-expire-old-pix',
  '*/10 * * * *',
  $$SELECT public.auto_expire_pix_cron();$$
);