-- Meta's data deletion callback, and the two things it needs from the schema.
--
-- Meta sends us an app-scoped USER id — the person who granted access — and
-- expects us to delete what we hold for them. Until now we stored only Page and
-- Instagram Business ids, which are not the same thing and cannot be mapped
-- back, so an incoming request was unanswerable.

-- 1. Remember who connected the account, not just what they connected.
--
-- Deliberately NOT granted to `authenticated`. The token-hardening migration
-- revoked table-level SELECT and granted it back column by column; a new column
-- is therefore invisible to the browser's role by default, which is what we
-- want. Do not add it to that grant list.
ALTER TABLE social_accounts
    ADD COLUMN IF NOT EXISTS platform_user_id TEXT;

CREATE INDEX IF NOT EXISTS social_accounts_platform_user_id_idx
    ON social_accounts (platform_user_id)
    WHERE platform_user_id IS NOT NULL;

-- 2. A record of every deletion, so the person can check it actually happened.
--
-- Meta requires the callback to return a URL where the user can look up the
-- status by confirmation code, and that page is public — no login, because the
-- person asking has just disconnected from us and may have no account left.
-- Reads happen server-side with the service role; the browser's roles get
-- nothing.
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    confirmation_code TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL,
    platform_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('completed', 'nothing_to_delete', 'failed')),
    accounts_removed INTEGER NOT NULL DEFAULT 0,
    posts_removed INTEGER NOT NULL DEFAULT 0,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS deletion_requests_code_idx
    ON deletion_requests (confirmation_code);

-- Supabase grants ALL on new public tables to anon and authenticated by
-- default. This table records that a named person asked to be deleted, so take
-- that back explicitly rather than relying on RLS alone.
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON deletion_requests FROM anon, authenticated;

-- Verify afterwards. "Success. No rows returned" proves nothing:
--   SELECT grantee, privilege_type FROM information_schema.table_privileges
--   WHERE table_name = 'deletion_requests';
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'social_accounts' AND column_name = 'platform_user_id';
