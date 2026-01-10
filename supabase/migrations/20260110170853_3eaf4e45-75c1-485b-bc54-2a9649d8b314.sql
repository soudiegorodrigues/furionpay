-- Criar extensão para busca de texto otimizada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice para paginação por usuário e data de criação
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_created 
ON pix_transactions (user_id, created_at DESC);

-- Índice para filtro de pagos por usuário
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_paid 
ON pix_transactions (user_id, paid_at DESC) WHERE status = 'paid';

-- Índice para status por usuário
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_status 
ON pix_transactions (user_id, status);

-- Índice para busca de texto com trigram
CREATE INDEX IF NOT EXISTS idx_pix_transactions_donor_name_trgm 
ON pix_transactions USING gin (donor_name gin_trgm_ops);

-- Índice para data de criação (usado em filtros de período)
CREATE INDEX IF NOT EXISTS idx_pix_transactions_created_at 
ON pix_transactions (created_at DESC);

-- Índice composto para queries mais comuns (user + status + created_at)
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_status_created 
ON pix_transactions (user_id, status, created_at DESC);