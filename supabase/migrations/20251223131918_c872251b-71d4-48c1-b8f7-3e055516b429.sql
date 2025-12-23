-- Criar índice único para user_id + key (permite upsert correto)
CREATE UNIQUE INDEX IF NOT EXISTS admin_settings_user_key_idx 
ON admin_settings (user_id, key) 
WHERE user_id IS NOT NULL;