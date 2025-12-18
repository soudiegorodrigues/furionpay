-- 1. Update ALL existing user_acquirer settings to 'ativus'
UPDATE admin_settings 
SET value = 'ativus', updated_at = now() 
WHERE key = 'user_acquirer';

-- 2. Upsert the default_acquirer global setting to 'ativus' using DO NOTHING and then UPDATE
INSERT INTO admin_settings (key, value, user_id, updated_at)
SELECT 'default_acquirer', 'ativus', NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE key = 'default_acquirer' AND user_id IS NULL);

UPDATE admin_settings 
SET value = 'ativus', updated_at = now()
WHERE key = 'default_acquirer' AND user_id IS NULL;

-- 3. Create RPC function to apply default acquirer to all users (except manual overrides)
CREATE OR REPLACE FUNCTION apply_default_acquirer_to_all(p_acquirer TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted_count INT;
  v_result JSON;
BEGIN
  -- Only admins can call this
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can apply default acquirer to all users';
  END IF;

  -- 1. Update the global default_acquirer (insert if not exists, update if exists)
  IF EXISTS (SELECT 1 FROM admin_settings WHERE key = 'default_acquirer' AND user_id IS NULL) THEN
    UPDATE admin_settings SET value = p_acquirer, updated_at = now() 
    WHERE key = 'default_acquirer' AND user_id IS NULL;
  ELSE
    INSERT INTO admin_settings (key, value, user_id, updated_at)
    VALUES ('default_acquirer', p_acquirer, NULL, now());
  END IF;
  
  -- 2. Delete user_acquirer for all users who are NOT marked as manual
  -- Users with user_acquirer_is_manual = 'true' will keep their setting
  DELETE FROM admin_settings 
  WHERE key = 'user_acquirer' 
  AND user_id IS NOT NULL
  AND user_id NOT IN (
    SELECT user_id FROM admin_settings 
    WHERE key = 'user_acquirer_is_manual' 
    AND value = 'true'
    AND user_id IS NOT NULL
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  SELECT json_build_object(
    'success', true,
    'acquirer', p_acquirer,
    'users_reset', v_deleted_count
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;