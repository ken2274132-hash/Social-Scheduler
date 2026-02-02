import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Shopify OAuth - Step 1: Initiate
 * Redirects user to Shopify to authorize our app
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const shopDomain = request.nextUrl.searchParams.get('shop')
        if (!shopDomain) {
            return NextResponse.json({ error: 'Shop domain is required' }, { status: 400 })
        }

        // Validate shop domain format
        const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
        if (!shopRegex.test(shopDomain)) {
            return NextResponse.json({ error: 'Invalid shop domain format' }, { status: 400 })
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

        // Generate a nonce for security (store user ID for callback)
        const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64')

        const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
            `client_id=${apiKey}&` +
            `scope=${scopes}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}`

        return NextResponse.redirect(authUrl)
    } catch (error: any) {
        console.error('Shopify auth error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
