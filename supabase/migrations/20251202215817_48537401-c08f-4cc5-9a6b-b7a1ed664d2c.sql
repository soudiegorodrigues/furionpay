-- Remove the constraint that only allows one key regardless of user_id
ALTER TABLE public.admin_settings DROP CONSTRAINT IF EXISTS admin_settings_key_key;

-- The admin_settings_key_user_unique constraint already exists and allows different users to have the same key
-- No need to add it again