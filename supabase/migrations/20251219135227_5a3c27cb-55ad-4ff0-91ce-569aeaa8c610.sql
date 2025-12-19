-- Add whitelist column to pix_rate_limits
ALTER TABLE pix_rate_limits 
ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN pix_rate_limits.is_whitelisted IS 'Se true, este IP/fingerprint está isento de rate limiting permanentemente';