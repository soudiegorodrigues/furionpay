-- =====================================================
-- PERFORMANCE OPTIMIZATION: Critical Database Indexes
-- =====================================================

-- Index for user_id lookups (99% of queries filter by user)
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_id 
ON public.pix_transactions(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_pix_transactions_status 
ON public.pix_transactions(status);

-- Composite index for dashboard queries (user + created_at DESC)
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_created 
ON public.pix_transactions(user_id, created_at DESC);

-- Composite index for paid transactions filtering (user + status + paid_at)
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_paid 
ON public.pix_transactions(user_id, status, paid_at DESC);

-- Index for txid lookups (used in status checks)
CREATE INDEX IF NOT EXISTS idx_pix_transactions_txid 
ON public.pix_transactions(txid);

-- Index for admin_settings user+key lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_user_key 
ON public.admin_settings(user_id, key);

-- Index for withdrawal_requests by user and status
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_status 
ON public.withdrawal_requests(user_id, status);

-- Index for finance_transactions by user and date
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date 
ON public.finance_transactions(user_id, date DESC);

-- Index for products by user
CREATE INDEX IF NOT EXISTS idx_products_user_id 
ON public.products(user_id);

-- Index for product_offers by product
CREATE INDEX IF NOT EXISTS idx_product_offers_product_id 
ON public.product_offers(product_id);