import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createOAuthState } from '@/lib/oauth-state'
import { errorResponse, clientError } from '@/lib/api'

/**
 * Meta OAuth - Step 1: Initiate
 *
 * This used to be built in the browser by ConnectFacebookButton, which meant
 * the workspace id travelled in a client-controlled `state` blob. Starting the
 * flow on the server lets us issue a CSRF nonce and keep the workspace id in
 * an httpOnly cookie the client cannot touch.
 */

const SCOPES: Record<string, string[]> = {
    facebook: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_read_user_content',
    ],
    instagram: [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
    ],
}

export async function GET(request: NextRequest) {
    try {
        const { user, db } = await requireAuth()

        const platform = request.nextUrl.searchParams.get('platform') || 'instagram'
        if (!SCOPES[platform]) {
            return clientError('Unsupported platform', 400)
        }

        const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID
        if (!appId) {
            console.error('Missing META_APP_ID')
            return clientError('Social connections are not configured.', 500)
        }

        // Resolve the workspace server-side rather than trusting the client.
        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!workspace) {
            return NextResponse.redirect(new URL('/settings?error=workspace_not_found', request.url))
        }

        const nonce = await createOAuthState('meta', {
            userId: user.id,
            workspaceId: workspace.id,
            platform,
        })

        const redirectUri = new URL('/api/auth/callback/meta', request.nextUrl.origin).toString()

        const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
        authUrl.searchParams.set('client_id', appId)
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('scope', SCOPES[platform].join(','))
        authUrl.searchParams.set('state', nonce)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('auth_type', 'rerequest')

        return NextResponse.redirect(authUrl.toString())
    } catch (error) {
        return errorResponse(error, 'meta/auth')
    }
}
