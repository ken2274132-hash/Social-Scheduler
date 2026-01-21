import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Pinterest OAuth - Step 2: Callback
 * Exchanges code for access token and saves to database
 */
export async function GET(request: NextRequest) {
    try {
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

        // Decode state to get user ID
        let userId: string
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
            userId = decoded.userId
        } catch {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=invalid_state`
            )
        }

        const clientId = process.env.PINTEREST_APP_ID
        const clientSecret = process.env.PINTEREST_APP_SECRET
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/pinterest`

        // Exchange code for access token
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

        const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
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
            console.error('Pinterest token error:', tokenData)
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=token_exchange_failed`
            )
        }

        const accessToken = tokenData.access_token
        const refreshToken = tokenData.refresh_token
        const expiresIn = tokenData.expires_in // seconds

        // Get Pinterest user info
        const userResponse = await fetch('https://api.pinterest.com/v5/user_account', {
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

        // Use service role to bypass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get user's workspace
        const { data: workspace, error: workspaceError } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', userId)
            .single()

        if (workspaceError || !workspace) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=workspace_not_found`
            )
        }

        // Save Pinterest account to social_accounts table
        const { error: upsertError } = await supabase
            .from('social_accounts')
            .upsert({
                workspace_id: workspace.id,
                platform: 'pinterest',
                account_name: accountName,
                account_id: accountId,
                access_token: accessToken,
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
        console.error('Pinterest callback error:', error)
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=unknown`
        )
    }
}
