-- Update get_rate_limit_stats to return separate statistics for IP vs Fingerprint
CREATE OR REPLACE FUNCTION public.get_rate_limit_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    -- Totais gerais
    'total_blocked_devices', (SELECT COUNT(*) FROM pix_rate_limits WHERE blocked_until > now()),
    'blocks_last_24h', (SELECT COUNT(*) FROM pix_rate_limits WHERE blocked_until IS NOT NULL AND updated_at > now() - interval '24 hours'),
    'total_records', (SELECT COUNT(*) FROM pix_rate_limits),
    
    -- Estatísticas por FINGERPRINT (fingerprint_hash != ip_address OR ip_address IS NULL)
    'fingerprint_blocked', (SELECT COUNT(*) FROM pix_rate_limits WHERE blocked_until > now() AND (fingerprint_hash != ip_address OR ip_address IS NULL)),
    'fingerprint_blocks_24h', (SELECT COUNT(*) FROM pix_rate_limits WHERE blocked_until IS NOT NULL AND updated_at > now() - interval '24 hours' AND (fingerprint_hash != ip_address OR ip_address IS NULL)),
    'fingerprint_total', (SELECT COUNT(*) FROM pix_rate_limits WHERE fingerprint_hash != ip_address OR ip_address IS NULL),
    
    -- Estatísticas por IP (fingerprint_hash = ip_address)
    'ip_blocked', (SELECT COUNT(*) FROM pix_rate_limits WHERE blocked_until > now() AND fingerprint_hash = ip_address),
    'ip_blocks_24h', (SELECT COUNT(*) FROM pix_rate_limits WHERE blocked_until IS NOT NULL AND updated_at > now() - interval '24 hours' AND fingerprint_hash = ip_address),
    'ip_total', (SELECT COUNT(*) FROM pix_rate_limits WHERE fingerprint_hash = ip_address)
  );
$$;