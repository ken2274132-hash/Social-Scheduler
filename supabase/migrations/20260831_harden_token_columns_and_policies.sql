-- Audit fixes: C1 (token exposure), M6 (missing DELETE policies, open insert policy)
--
-- Run this in the Supabase SQL editor. It is idempotent.

-- =============================================================
-- C1: make OAuth tokens unreadable by the browser
--
-- RLS controls which ROWS a role can see; it cannot restrict COLUMNS.
-- Column-level GRANTs can. Revoking SELECT on just the token columns means a
-- stray `select('*')` from a client or a server component returns an error
-- instead of silently shipping credentials to the browser.
--
-- The service-role key (used by lib/posting-engine.ts, which genuinely needs
-- the tokens to publish) bypasses these grants entirely and is unaffected.
-- =============================================================

-- NOTE (corrected 2026-09-01): a column-level REVOKE is silently useless while
-- the role still holds table-level SELECT — Postgres takes the union of the
-- two, so the statement succeeds and changes nothing. Supabase grants
-- `ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated` by default, so
-- that was exactly the situation here. The table-level grant has to go first,
-- and SELECT is then handed back column by column.
--
-- Done dynamically so the column list cannot drift out of sync with the table.
-- Consequence to remember: a column added later is NOT readable by anon or
-- authenticated until this block is re-run. That fails safe, but it fails.

DO $$
DECLARE
    cols text;
BEGIN
    SELECT string_agg(quote_ident(column_name), ', ')
      INTO cols
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'social_accounts'
       AND column_name NOT IN ('access_token', 'refresh_token');

    EXECUTE 'REVOKE SELECT ON public.social_accounts FROM anon, authenticated';
    EXECUTE format('GRANT SELECT (%s) ON public.social_accounts TO anon, authenticated', cols);

    SELECT string_agg(quote_ident(column_name), ', ')
      INTO cols
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'shopify_accounts'
       AND column_name <> 'access_token';

    EXECUTE 'REVOKE SELECT ON public.shopify_accounts FROM anon, authenticated';
    EXECUTE format('GRANT SELECT (%s) ON public.shopify_accounts TO anon, authenticated', cols);
END $$;

-- The OAuth callbacks still need to WRITE tokens as the signed-in user.
-- Those are separate privileges and stay in place.
GRANT INSERT (access_token, refresh_token), UPDATE (access_token, refresh_token)
    ON public.social_accounts TO authenticated;
GRANT INSERT (access_token), UPDATE (access_token)
    ON public.shopify_accounts TO authenticated;

-- =============================================================
-- M6: users could never delete their own posts or media
-- =============================================================

DROP POLICY IF EXISTS "Users can delete posts in their workspaces" ON public.posts;
CREATE POLICY "Users can delete posts in their workspaces"
    ON public.posts FOR DELETE
    USING (check_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Users can update media in their workspaces" ON public.media_assets;
CREATE POLICY "Users can update media in their workspaces"
    ON public.media_assets FOR UPDATE
    USING (check_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Users can delete media in their workspaces" ON public.media_assets;
CREATE POLICY "Users can delete media in their workspaces"
    ON public.media_assets FOR DELETE
    USING (check_is_workspace_member(workspace_id));

-- =============================================================
-- M6: ai_generations accepted an insert against ANY media row
-- =============================================================

DROP POLICY IF EXISTS "Users can create AI generations" ON public.ai_generations;
CREATE POLICY "Users can create AI generations"
    ON public.ai_generations FOR INSERT
    WITH CHECK (
        media_id IN (
            SELECT id FROM public.media_assets
            WHERE check_is_workspace_member(workspace_id)
        )
    );
