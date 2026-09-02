import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createOAuthState } from '@/lib/oauth-state'
import { errorResponse, clientError } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * Shopify OAuth - Step 1: Initiate
 * Redirects user to Shopify to authorize our app
 */
export async function GET(request: NextRequest) {
    try {
        const limited = await enforceRateLimit(request, 'oauth')
        if (limited) return limited

        const { user } = await requireAuth()

        const shopDomain = request.nextUrl.searchParams.get('shop')
        if (!shopDomain) {
            return clientError('Shop domain is required', 400)
        }

        // Validate shop domain format
        const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
        if (!shopRegex.test(shopDomain)) {
            return clientError('Invalid shop domain format', 400)
        }

        const apiKey = process.env.SHOPIFY_API_KEY
        const scopes = process.env.SHOPIFY_SCOPES || 'read_products'

        // Use URL constructor to handle slashes correctly
        const redirectUri = new URL('/api/shopify/callback', request.nextUrl.origin).toString()

        if (!apiKey) {
            console.error('Missing SHOPIFY_API_KEY environment variable')
            return NextResponse.json({
                error: 'Shopify configuration missing on server. Please ensure SHOPIFY_API_KEY is set in .env.local and restart the server.'
            }, { status: 500 })
        }

        // Random nonce in an httpOnly cookie; Shopify only ever sees the nonce.
        const state = await createOAuthState('shopify', { userId: user.id })

        const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
            `client_id=${apiKey}&` +
            `scope=${scopes}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}`

        return NextResponse.redirect(authUrl)
    } catch (error) {
        return errorResponse(error, 'shopify/auth')
    }
}
