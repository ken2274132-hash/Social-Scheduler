import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { consumeOAuthState } from '@/lib/oauth-state'

/**
 * Shopify OAuth - Step 2: Callback
 * Exchanges code for access token and saves to database
 */

const SHOP_DOMAIN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/

/**
 * Shopify signs every callback. Verifying the HMAC is what proves the request
 * actually came from Shopify and was not forged by whoever loaded the URL.
 * https://shopify.dev/docs/apps/auth/oauth/getting-started#step-3-verify-the-installation-request
 */
function hmacIsValid(url: URL, secret: string): boolean {
    const params = new URLSearchParams(url.search)
    const received = params.get('hmac')
    if (!received) return false

    params.delete('hmac')
    params.delete('signature')

    const sorted = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    const message = sorted.map(([k, v]) => `${k}=${v}`).join('&')

    const expected = crypto.createHmac('sha256', secret).update(message).digest('hex')

    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(received, 'utf8')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
    const fail = (reason: string) =>
        NextResponse.redirect(`${request.nextUrl.origin}/settings?error=${reason}`)

    try {
        const code = request.nextUrl.searchParams.get('code')
        const shop = request.nextUrl.searchParams.get('shop')
        const state = request.nextUrl.searchParams.get('state')

        if (!code || !shop || !state) {
            return fail('missing_params')
        }

        // Validate the shop domain BEFORE it is used to build any URL.
        // Without this, `shop` is attacker-controlled and the token exchange
        // below would POST our client_secret to whatever host they name.
        if (!SHOP_DOMAIN.test(shop)) {
            console.error('Shopify callback: rejected shop domain', shop)
            return fail('invalid_shop')
        }

        const apiKey = process.env.SHOPIFY_API_KEY
        const apiSecret = process.env.SHOPIFY_API_SECRET

        if (!apiKey || !apiSecret) {
            console.error('Missing Shopify configuration in callback')
            return fail('shopify_config_missing')
        }

        if (!hmacIsValid(request.nextUrl, apiSecret)) {
            console.error('Shopify callback: HMAC verification failed')
            return fail('invalid_signature')
        }

        // The nonce we set when starting the flow. Proves this callback belongs
        // to a flow this browser actually began, and tells us who began it.
        const stateData = await consumeOAuthState(request, 'shopify', state)
        if (!stateData) {
            return fail('invalid_state')
        }
        const userId = stateData.userId

        // Exchange code for access token
        const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: apiKey,
                client_secret: apiSecret,
                code: code,
            }),
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Shopify token error:', tokenData)
            return fail('token_exchange_failed')
        }

        const accessToken = tokenData.access_token

        // Get shop info
        const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
            },
        })
        const shopInfo = await shopInfoResponse.json()
        const shopName = shopInfo.shop?.name || shop

        // Service role is required here: this runs in a redirect from Shopify,
        // and the user id comes from our own signed state rather than a session.
        const supabase = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        )

        // Get user's workspace
        const { data: workspace, error: workspaceError } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (workspaceError || !workspace) {
            console.error('Shopify workspace error:', workspaceError)
            return fail('workspace_not_found')
        }

        // Save or update Shopify account
        const { error: upsertError } = await supabase
            .from('shopify_accounts')
            .upsert({
                workspace_id: workspace.id,
                shop_domain: shop,
                access_token: accessToken,
                shop_name: shopName,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'workspace_id,shop_domain',
            })

        if (upsertError) {
            console.error('Shopify save error:', upsertError)
            return fail('shopify_save_failed')
        }

        return NextResponse.redirect(
            `${request.nextUrl.origin}/settings?success=shopify_connected`
        )
    } catch (error: any) {
        console.error('Shopify callback error:', error)
        return fail('callback_error')
    }
}
