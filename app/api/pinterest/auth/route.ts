import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createOAuthState } from '@/lib/oauth-state'
import { errorResponse, clientError } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * Pinterest OAuth - Step 1: Initiate
 * Redirects user to Pinterest to authorize our app
 */
export async function GET(request: NextRequest) {
    try {
        const limited = await enforceRateLimit(request, 'oauth')
        if (limited) return limited

        const { user } = await requireAuth()

        const clientId = process.env.PINTEREST_APP_ID
        if (!clientId) {
            console.error('Missing PINTEREST_APP_ID')
            return clientError('Pinterest is not configured.', 500)
        }

        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '')
        const redirectUri = `${baseUrl}/api/auth/callback/pinterest`

        // Pinterest scopes for reading/writing pins and boards
        const scopes = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read'

        // Random nonce held in an httpOnly cookie, not a client-readable blob.
        const nonce = await createOAuthState('pinterest', { userId: user.id })

        const authUrl = new URL('https://www.pinterest.com/oauth/')
        authUrl.searchParams.set('client_id', clientId)
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', scopes)
        authUrl.searchParams.set('state', nonce)

        return NextResponse.redirect(authUrl.toString())
    } catch (error) {
        return errorResponse(error, 'pinterest/auth')
    }
}
