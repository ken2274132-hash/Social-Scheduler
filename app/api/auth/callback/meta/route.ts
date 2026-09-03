import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { consumeOAuthState } from '@/lib/oauth-state'
import { enforceRateLimit } from '@/lib/rate-limit'
import { socialAccountsWriter } from '@/lib/social-accounts'

export async function GET(request: NextRequest) {
    const limited = await enforceRateLimit(request, 'oauth')
    if (limited) return limited

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const fail = (reason: string) =>
        NextResponse.redirect(new URL(`/settings?error=${reason}`, request.url))

    if (error) {
        return fail('oauth_denied')
    }

    if (!code || !state) {
        return fail('invalid_request')
    }

    try {
        // Verify this callback belongs to a flow this browser actually started,
        // and recover the workspace id we stored server-side when it began.
        const stateData = await consumeOAuthState(request, 'meta', state)
        if (!stateData?.workspaceId) {
            return fail('invalid_state')
        }

        const { workspaceId, userId } = stateData
        const targetPlatform = stateData.platform || 'instagram'

        const supabase = await createClient()

        // Belt and braces: confirm the signed-in user still owns this workspace
        // before writing anything to it. RLS enforces this too, but an explicit
        // check gives a clear error instead of a confusing insert failure.
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.id !== userId) {
            return fail('invalid_session')
        }

        const { data: ownedWorkspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .eq('owner_id', user.id)
            .maybeSingle()

        if (!ownedWorkspace) {
            return fail('workspace_not_found')
        }

        // Exchange code for access_token
        const redirectUri = `${request.nextUrl.origin}/api/auth/callback/meta`

        if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
            console.error('Missing Meta App credentials')
            return fail('config_error')
        }

        const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
        tokenUrl.searchParams.set('client_id', process.env.META_APP_ID)
        tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET)
        tokenUrl.searchParams.set('redirect_uri', redirectUri)
        tokenUrl.searchParams.set('code', code)

        const tokenResponse = await fetch(tokenUrl.toString())
        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Token exchange failed:', tokenData?.error?.message)
            return fail('connection_failed')
        }

        const accessToken = tokenData.access_token

        // Exchange short-lived token for long-lived token
        const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
        longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
        longLivedUrl.searchParams.set('client_id', process.env.META_APP_ID)
        longLivedUrl.searchParams.set('client_secret', process.env.META_APP_SECRET)
        longLivedUrl.searchParams.set('fb_exchange_token', accessToken)

        const longLivedResponse = await fetch(longLivedUrl.toString())
        const longLivedData = await longLivedResponse.json()

        const finalAccessToken = longLivedData.access_token || accessToken

        // Get the user's Facebook Pages.
        // Note: never log the response body — it contains page access tokens.
        const accountsResponse = await fetch(
            `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,picture,tasks&access_token=${finalAccessToken}`
        )
        const accountsData = await accountsResponse.json()

        if (!accountsResponse.ok || !accountsData.data) {
            console.error('Failed to fetch Facebook accounts:', accountsData?.error?.message)
            return fail('connection_failed')
        }

        if (accountsData.data.length === 0) {
            console.log('Meta OAuth: user granted access but has no manageable Pages')
            return fail('no_pages')
        }

        // Page tokens are requested separately so they never enter the log above.
        const page = accountsData.data[0]
        const pageId = page.id
        const pageName = page.name

        const pageTokenResponse = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}?fields=access_token,picture&access_token=${finalAccessToken}`
        )
        const pageTokenData = await pageTokenResponse.json()
        const pageAccessToken = pageTokenData.access_token

        if (!pageAccessToken) {
            console.error('Could not obtain page access token:', pageTokenData?.error?.message)
            return fail('connection_failed')
        }

        if (targetPlatform === 'facebook') {
            const profilePictureUrl = pageTokenData.picture?.data?.url || null

            const { error: dbError } = await socialAccountsWriter().from('social_accounts').upsert({
                workspace_id: workspaceId,
                platform: 'facebook',
                account_id: pageId,
                account_name: pageName,
                profile_picture_url: profilePictureUrl,
                access_token: pageAccessToken,
                token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
                is_active: true,
            }, {
                onConflict: 'workspace_id,account_id'
            })

            if (dbError) {
                console.error('Failed to save Facebook account:', dbError)
                return fail('save_failed')
            }

            return NextResponse.redirect(new URL('/settings?success=connected', request.url))
        }

        // Connect Instagram account
        const igResponse = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
        )

        const igData = await igResponse.json()

        if (!igResponse.ok || !igData.instagram_business_account) {
            console.error('Failed to fetch Instagram account:', igData?.error?.message)
            return fail('no_instagram')
        }

        const igBusinessId = igData.instagram_business_account.id

        const igDetailsResponse = await fetch(
            `https://graph.facebook.com/v21.0/${igBusinessId}?fields=username,profile_picture_url&access_token=${pageAccessToken}`
        )

        const igDetails = await igDetailsResponse.json()

        const { error: dbError } = await socialAccountsWriter().from('social_accounts').upsert({
            workspace_id: workspaceId,
            platform: 'instagram',
            account_id: igBusinessId,
            account_name: igDetails.username,
            profile_picture_url: igDetails.profile_picture_url,
            access_token: pageAccessToken,
            token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
            is_active: true,
        }, {
            onConflict: 'workspace_id,account_id'
        })

        if (dbError) {
            console.error('Failed to save Instagram account:', dbError)
            return fail('save_failed')
        }

        return NextResponse.redirect(new URL('/settings?success=connected', request.url))
    } catch (error) {
        console.error('OAuth callback error:', error)
        return fail('connection_failed')
    }
}
