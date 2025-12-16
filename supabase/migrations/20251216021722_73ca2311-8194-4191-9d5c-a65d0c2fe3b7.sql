-- Create RPC function to get rate limit statistics
CREATE OR REPLACE FUNCTION get_rate_limit_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_blocked_devices', (SELECT COUNT(*) FROM pix_rate_limits WHERE blocked_until > now()),
    'blocks_last_24h', (SELECT COUNT(*) FROM pix_rate_limits WHERE blocked_until IS NOT NULL AND updated_at > now() - interval '24 hours'),
    'total_records', (SELECT COUNT(*) FROM pix_rate_limits)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION get_rate_limit_stats() TO authenticated;

-- Insert default rate limit configuration values
INSERT INTO admin_settings (user_id, key, value) VALUES
(NULL, 'rate_limit_enabled', 'true'),
(NULL, 'rate_limit_max_unpaid', '2'),
(NULL, 'rate_limit_window_hours', '36'),
(NULL, 'rate_limit_cooldown_seconds', '30')
ON CONFLICT DO NOTHING;