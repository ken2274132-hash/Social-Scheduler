import { NextRequest, NextResponse } from 'next/server'
import { socialAccountsWriter } from '@/lib/social-accounts'
import { createClient } from '@/lib/supabase/server'
import { consumeOAuthState } from '@/lib/oauth-state'
import { enforceRateLimit } from '@/lib/rate-limit'
import { pinterestApiBaseUrl } from '@/lib/pinterest'

/**
 * Pinterest OAuth - Step 2: Callback
 * Exchanges code for access token and saves to database
 */
export async function GET(request: NextRequest) {
    try {
        const limited = await enforceRateLimit(request, 'oauth')
        if (limited) return limited

        const code = request.nextUrl.searchParams.get('code')
        const state = request.nextUrl.searchParams.get('state')
        const error = request.nextUrl.searchParams.get('error')

        if (error) {
            console.error('Pinterest OAuth error:', error)
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=pinterest_denied`
            )
        }

        if (!code || !state) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`
            )
        }

        // Verify the nonce we issued when the flow started.
        const stateData = await consumeOAuthState(request, 'pinterest', state)
        if (!stateData) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=invalid_state`
            )
        }
        const userId = stateData.userId

        const clientId = process.env.PINTEREST_APP_ID
        const clientSecret = process.env.PINTEREST_APP_SECRET
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || ''
        const redirectUri = `${baseUrl}/api/auth/callback/pinterest`

        // Exchange code for access token
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        const apiBaseUrl = pinterestApiBaseUrl()

        const tokenResponse = await fetch(`${apiBaseUrl}/v5/oauth/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
        })

        const tokenData = await tokenResponse.json()

        if (tokenData.error || !tokenData.access_token) {
            console.error('Pinterest token exchange failed:', tokenData)
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=token_exchange_failed`
            )
        }

        const accessToken = tokenData.access_token
        const refreshToken = tokenData.refresh_token
        const expiresIn = tokenData.expires_in // seconds

        // Get Pinterest user info
        const userResponse = await fetch(`${apiBaseUrl}/v5/user_account`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })
        const userData = await userResponse.json()

        const accountName = userData.username || userData.id
        const accountId = userData.id
        const profilePicture = userData.profile_image

        // Calculate token expiry
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        // Use standard server client which is safer
        const supabase = await createClient()

        // Use the userId from state to ensure we're targeting the right account
        // but we'll use the authenticated user's session for security
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser || authUser.id !== userId) {
            console.error('Pinterest auth mismatch:', { authUser: authUser?.id, stateUser: userId })
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=invalid_session`
            )
        }

        // Get user's workspace
        const { data: workspace, error: workspaceError } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', authUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (workspaceError || !workspace) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=workspace_not_found`
            )
        }

        // Save Pinterest account to social_accounts table
        const { error: upsertError } = await socialAccountsWriter()
            .from('social_accounts')
            .upsert({
                workspace_id: workspace.id,
                platform: 'pinterest',
                account_name: accountName,
                account_id: accountId,
                access_token: accessToken,
                refresh_token: refreshToken,
                token_expires_at: expiresAt,
                profile_picture_url: profilePicture,
                is_active: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'workspace_id,account_id',
            })

        if (upsertError) {
            console.error('Pinterest save error:', upsertError)
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=save_failed`
            )
        }

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=pinterest_connected`
        )
    } catch (error: any) {
        console.error('Pinterest callback critical error:', error)
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=callback_error`
        )
    }
}
