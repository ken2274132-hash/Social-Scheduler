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

REVOKE SELECT (access_token, refresh_token) ON public.social_accounts FROM anon, authenticated;
REVOKE SELECT (access_token) ON public.shopify_accounts FROM anon, authenticated;

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
