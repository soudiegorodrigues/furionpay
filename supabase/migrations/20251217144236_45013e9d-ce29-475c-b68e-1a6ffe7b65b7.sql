-- =============================================
-- COLUNAS GERADAS PARA TIMEZONE BRASIL
-- =============================================

-- Adicionar coluna gerada para data de criação no timezone Brasil
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS created_date_brazil DATE 
GENERATED ALWAYS AS ((created_at AT TIME ZONE 'America/Sao_Paulo')::DATE) STORED;

-- Adicionar coluna gerada para data de pagamento no timezone Brasil
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS paid_date_brazil DATE 
GENERATED ALWAYS AS ((paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE) STORED;

-- =============================================
-- ÍNDICES NAS COLUNAS GERADAS
-- =============================================

-- Índice na data de criação Brasil para filtros por dia
CREATE INDEX IF NOT EXISTS idx_pix_created_date_brazil 
ON public.pix_transactions (created_date_brazil DESC);

-- Índice na data de pagamento Brasil para filtros por dia (somente pagos)
CREATE INDEX IF NOT EXISTS idx_pix_paid_date_brazil 
ON public.pix_transactions (paid_date_brazil DESC)
WHERE status = 'paid';

-- Índice composto para dashboard com timezone pré-calculado
CREATE INDEX IF NOT EXISTS idx_pix_paid_brazil_status_user 
ON public.pix_transactions (paid_date_brazil, user_id, amount)
WHERE status = 'paid';

-- Índice para queries globais por status e data
CREATE INDEX IF NOT EXISTS idx_pix_paid_brazil_status 
ON public.pix_transactions (paid_date_brazil DESC, status);

-- Índice para queries de usuário por data de criação
CREATE INDEX IF NOT EXISTS idx_pix_created_brazil_user 
ON public.pix_transactions (created_date_brazil, user_id, status);