-- Add banner_url setting to admin_settings (user-specific)
-- The admin_settings table already exists with user_id support
-- We'll use the key 'dashboard_banner_url' to store the banner URL for each user

-- No schema changes needed - we'll use the existing admin_settings table
-- with key = 'dashboard_banner_url' and value = the banner image URL