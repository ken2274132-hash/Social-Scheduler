import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse, clientError } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
    WordPressError,
    resolveSiteUrl,
    buildBasicCredential,
    wpHeaders,
    describeWpFailure,
} from '@/lib/wordpress'

/**
 * Connect a self-hosted WordPress site.
 *
 * Unlike the other platforms this is not an OAuth redirect — the user pastes a
 * site address, their username and an application password, and we verify the
 * three together by calling the site as them before storing anything.
 */

const TIMEOUT_MS = 10_000

export async function POST(request: NextRequest) {
    try {
        // Credential-checking route: limit by IP, same as the OAuth flows.
        const limited = await enforceRateLimit(request, 'oauth')
        if (limited) return limited

        const { user, db } = await requireAuth()

        const body = await request.json().catch(() => null)
        if (!body) return clientError('Invalid request.', 400)

        const { siteUrl, username, appPassword } = body as Record<string, string>

        if (!siteUrl || !username || !appPassword) {
            return clientError('Site address, username and application password are all required.', 400)
        }

        let origin: string
        try {
            origin = await resolveSiteUrl(siteUrl)
        } catch (error) {
            if (error instanceof WordPressError) return clientError(error.message, 400)
            throw error
        }

        const credential = buildBasicCredential(username, appPassword)

        // Verify before persisting: this both proves the credential works and
        // tells us the display name to show on the settings page.
        const meResponse = await fetch(`${origin}/wp-json/wp/v2/users/me?context=edit`, {
            headers: { ...wpHeaders(credential), Accept: 'application/json' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        }).catch(() => null)

        if (!meResponse) {
            return clientError('We could not reach your site. Check the address and that it is online.', 400)
        }

        const meText = await meResponse.text()
        if (!meResponse.ok) {
            return clientError(describeWpFailure(meResponse.status, meText), 400)
        }

        let me: any
        try {
            me = JSON.parse(meText)
        } catch {
            return clientError('That address did not return a WordPress API response.', 400)
        }

        // A subscriber can authenticate perfectly well and still not be able to
        // publish. Better to say so now than to fail silently at posting time.
        // `capabilities` only comes back with context=edit, so treat its
        // absence as "cannot tell" rather than "cannot publish".
        if (me.capabilities && me.capabilities.publish_posts !== true) {
            return clientError(
                `${me.name || username} cannot publish posts on that site. Use an account with Author permissions or higher.`,
                400
            )
        }

        // Site title is a nicety; a failure here should not block the connect.
        let siteTitle = origin.replace(/^https?:\/\//, '')
        try {
            const rootResponse = await fetch(`${origin}/wp-json`, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(TIMEOUT_MS),
            })
            if (rootResponse.ok) {
                const root = await rootResponse.json()
                if (root?.name) siteTitle = root.name
            }
        } catch {
            // keep the hostname
        }

        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!workspace) {
            return clientError('No workspace found for your account.', 400)
        }

        const { error: upsertError } = await db
            .from('social_accounts')
            .upsert(
                {
                    workspace_id: workspace.id,
                    platform: 'wordpress',
                    account_name: siteTitle,
                    // The origin is the natural per-workspace identity for a
                    // site, and matches the existing conflict target.
                    account_id: origin,
                    access_token: credential,
                    refresh_token: null,
                    // Application passwords do not expire on their own.
                    token_expires_at: null,
                    profile_picture_url: me.avatar_urls?.['96'] ?? null,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'workspace_id,account_id' }
            )

        if (upsertError) {
            return errorResponse(upsertError, 'wordpress/connect')
        }

        return NextResponse.json({ site: siteTitle, url: origin })
    } catch (error) {
        return errorResponse(error, 'wordpress/connect')
    }
}
