-- Add refresh_token column to social_accounts table
-- This is needed for Pinterest (and potentially other platforms) to refresh access tokens

ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Add comment for documentation
COMMENT ON COLUMN social_accounts.refresh_token IS 'OAuth refresh token for long-lived access (used by Pinterest and other platforms)';
