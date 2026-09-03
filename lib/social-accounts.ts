import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Writes to `social_accounts` run with the service role, never as the signed-in
 * user.
 *
 * The token-hardening migration revoked table-level privileges from
 * `authenticated` and granted them back deliberately: SELECT column by column,
 * so `access_token` never reaches the browser, plus INSERT. It did not grant
 * UPDATE or DELETE. Every connect flow upserts, and `INSERT ... ON CONFLICT DO
 * UPDATE` needs UPDATE as well as INSERT, so as the user they all fail with
 * Postgres 42501 — "permission denied for table social_accounts". Disconnect,
 * which is an UPDATE, fails the same way.
 *
 * The fix is deliberately here and not a `GRANT UPDATE, DELETE TO authenticated`
 * in a migration. Granting them would hand the browser's role write access to a
 * table full of live access tokens, which is the opposite of what the hardening
 * was for. Doing the write server-side keeps the table locked down, and keeps
 * the app working even if that migration is ever re-run.
 *
 * The caller must have already established that the signed-in user owns the
 * workspace being written to. RLS is not doing it here.
 */
export function socialAccountsWriter(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )
}
