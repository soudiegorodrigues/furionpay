-- Migrar banner existente do admin para configuração global
INSERT INTO admin_settings (key, value, user_id, created_at, updated_at)
SELECT 
  'global_dashboard_banner_url',
  value,
  NULL,
  now(),
  now()
FROM admin_settings 
WHERE key = 'dashboard_banner_url' 
  AND user_id IS NOT NULL
  AND value IS NOT NULL
  AND value != ''
LIMIT 1
ON CONFLICT DO NOTHING;