-- Performance optimization indexes for frequently queried tables

-- pix_transactions (most queried table)
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_id ON public.pix_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_transactions_status ON public.pix_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pix_transactions_created_at ON public.pix_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pix_transactions_paid_at ON public.pix_transactions(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_pix_transactions_user_status ON public.pix_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pix_transactions_txid ON public.pix_transactions(txid);

-- admin_settings (frequent lookups by user_id and key)
CREATE INDEX IF NOT EXISTS idx_admin_settings_user_id ON public.admin_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON public.admin_settings(key);
CREATE INDEX IF NOT EXISTS idx_admin_settings_user_key ON public.admin_settings(user_id, key);

-- profiles (user lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);

-- withdrawal_requests
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_status ON public.withdrawal_requests(user_id, status);

-- api_monitoring_events (logs and analytics)
CREATE INDEX IF NOT EXISTS idx_api_monitoring_acquirer ON public.api_monitoring_events(acquirer);
CREATE INDEX IF NOT EXISTS idx_api_monitoring_created_at ON public.api_monitoring_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_monitoring_event_type ON public.api_monitoring_events(event_type);

-- checkout_offers
CREATE INDEX IF NOT EXISTS idx_checkout_offers_user_id ON public.checkout_offers(user_id);

-- products
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- finance_transactions
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_id ON public.finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON public.finance_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category ON public.finance_transactions(category_id);

-- user_verification
CREATE INDEX IF NOT EXISTS idx_user_verification_user_id ON public.user_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verification_status ON public.user_verification(status);

-- rewards
CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON public.rewards(is_active);

-- Update table statistics for query optimizer
ANALYZE public.pix_transactions;
ANALYZE public.admin_settings;
ANALYZE public.profiles;
ANALYZE public.withdrawal_requests;
ANALYZE public.api_monitoring_events;
ANALYZE public.checkout_offers;
ANALYZE public.products;
ANALYZE public.finance_transactions;
ANALYZE public.user_verification;
ANALYZE public.rewards;