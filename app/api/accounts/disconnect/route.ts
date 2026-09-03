import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse, clientError } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { socialAccountsWriter } from '@/lib/social-accounts'

/**
 * Disconnect a connected account.
 *
 * This used to be an `update({ is_active: false })` issued straight from the
 * browser. That cannot work: `authenticated` has no UPDATE privilege on
 * `social_accounts` (see lib/social-accounts.ts), so Postgres rejected it with
 * 42501 — and because the caller never inspected the returned error, the page
 * simply reloaded with the account still connected. A silent no-op is worse
 * than an error, so the write moved here where it can be checked.
 *
 * Disconnecting also clears the credentials rather than only flipping the flag.
 * Leaving a live access token in a row the user believes is disconnected is
 * exactly the state the token audit was about.
 */
export async function POST(request: NextRequest) {
    try {
        const limited = await enforceRateLimit(request, 'write')
        if (limited) return limited

        const { user } = await requireAuth()

        const body = await request.json().catch(() => null)
        const accountId = body?.accountId

        if (!accountId || typeof accountId !== 'string') {
            return clientError('Which account? None was given.', 400)
        }

        const writer = socialAccountsWriter()

        const { data: account } = await writer
            .from('social_accounts')
            .select('id, workspace_id')
            .eq('id', accountId)
            .maybeSingle()

        // RLS is not protecting this write, so ownership is checked here. Both
        // "no such account" and "not yours" answer the same, so the response
        // cannot be used to discover which account ids exist.
        const owned = account
            ? await writer
                .from('workspaces')
                .select('id')
                .eq('id', account.workspace_id)
                .eq('owner_id', user.id)
                .maybeSingle()
            : { data: null }

        if (!account || !owned.data) {
            return clientError('Account not found.', 404)
        }

        const { error } = await writer
            .from('social_accounts')
            .update({
                is_active: false,
                access_token: '',
                refresh_token: null,
                token_expires_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', accountId)

        if (error) {
            return errorResponse(error, 'accounts/disconnect')
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        return errorResponse(error, 'accounts/disconnect')
    }
}
