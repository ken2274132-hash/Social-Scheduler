import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(new URL('/settings?error=oauth_denied', request.url))
    }

    if (!code || !state) {
        return NextResponse.redirect(new URL('/settings?error=invalid_request', request.url))
    }

    try {
        let decodedState;
        try {
            decodedState = JSON.parse(atob(state))
        } catch (e) {
            console.error('Failed to decode state:', e)
            return NextResponse.redirect(new URL('/settings?error=invalid_state', request.url))
        }

        const { workspaceId, platform } = decodedState
        const targetPlatform = platform || 'instagram'

        // Exchange code for access_token
        const redirectUri = `${request.nextUrl.origin}/api/auth/callback/meta`

        if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
            console.error('Missing Meta App credentials')
            return NextResponse.redirect(new URL('/settings?error=config_error', request.url))
        }

        const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
        tokenUrl.searchParams.set('client_id', process.env.META_APP_ID)
        tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET)
        tokenUrl.searchParams.set('redirect_uri', redirectUri)
        tokenUrl.searchParams.set('code', code)

        const tokenResponse = await fetch(tokenUrl.toString())
        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Token exchange failed:', tokenData)
            throw new Error(tokenData.error?.message || 'Token exchange failed')
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

        // Get user's Facebook Pages
        const accountsResponse = await fetch(
            `https://graph.facebook.com/v21.0/me/accounts?access_token=${finalAccessToken}`
        )

        const accountsData = await accountsResponse.json()

        if (!accountsResponse.ok || !accountsData.data) {
            console.error('Failed to fetch Facebook accounts:', accountsData)
            throw new Error(accountsData.error?.message || 'Failed to fetch Facebook accounts')
        }

        if (accountsData.data.length === 0) {
            return NextResponse.redirect(new URL('/settings?error=no_pages', request.url))
        }

        // Get the first page's details
        const page = accountsData.data[0]
        const pageId = page.id
        const pageAccessToken = page.access_token
        const pageName = page.name

        const supabase = await createClient()

        if (targetPlatform === 'facebook') {
            // Connect Facebook Page directly
            // Get page profile picture
            const pageDetailsResponse = await fetch(
                `https://graph.facebook.com/v21.0/${pageId}?fields=picture&access_token=${pageAccessToken}`
            )
            const pageDetails = await pageDetailsResponse.json()
            const profilePictureUrl = pageDetails.picture?.data?.url || null

            // Store the Facebook Page account
            const { error: dbError } = await supabase.from('social_accounts').upsert({
                workspace_id: workspaceId,
                platform: 'facebook',
                account_id: pageId,
                account_name: pageName,
                profile_picture_url: profilePictureUrl,
                access_token: pageAccessToken, // Store encrypted in production
                token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
                is_active: true,
            }, {
                onConflict: 'workspace_id,account_id'
            })

            if (dbError) throw dbError

            return NextResponse.redirect(new URL('/settings?success=connected', request.url))
        } else {
            // Connect Instagram account
            const igResponse = await fetch(
                `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
            )

            const igData = await igResponse.json()

            if (!igResponse.ok || !igData.instagram_business_account) {
                console.error('Failed to fetch Instagram account:', igData)
                return NextResponse.redirect(new URL('/settings?error=no_instagram', request.url))
            }

            const igBusinessId = igData.instagram_business_account.id

            // Get Instagram account details
            const igDetailsResponse = await fetch(
                `https://graph.facebook.com/v21.0/${igBusinessId}?fields=username,profile_picture_url&access_token=${pageAccessToken}`
            )

            const igDetails = await igDetailsResponse.json()

            // Store the account
            const { error: dbError } = await supabase.from('social_accounts').upsert({
                workspace_id: workspaceId,
                platform: 'instagram',
                account_id: igBusinessId,
                account_name: igDetails.username,
                profile_picture_url: igDetails.profile_picture_url,
                access_token: pageAccessToken, // Store encrypted in production
                token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
                is_active: true,
            }, {
                onConflict: 'workspace_id,account_id'
            })

            if (dbError) throw dbError

            return NextResponse.redirect(new URL('/settings?success=connected', request.url))
        }
    } catch (error) {
        console.error('OAuth callback error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.redirect(new URL(`/settings?error=connection_failed&details=${encodeURIComponent(errorMessage)}`, request.url))
    }
}
