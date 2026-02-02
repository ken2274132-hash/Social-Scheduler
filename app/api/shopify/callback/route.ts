import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Shopify OAuth - Step 2: Callback
 * Exchanges code for access token and saves to database
 */
export async function GET(request: NextRequest) {
    try {
        const code = request.nextUrl.searchParams.get('code')
        const shop = request.nextUrl.searchParams.get('shop')
        const state = request.nextUrl.searchParams.get('state')

        if (!code || !shop || !state) {
            return NextResponse.redirect(
                `${request.nextUrl.origin}/settings?error=missing_params`
            )
        }

        // Decode state to get user ID
        let userId: string
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
            userId = decoded.userId
        } catch {
            return NextResponse.redirect(
                `${request.nextUrl.origin}/settings?error=invalid_state`
            )
        }

        const apiKey = process.env.SHOPIFY_API_KEY
        const apiSecret = process.env.SHOPIFY_API_SECRET

        if (!apiKey || !apiSecret) {
            console.error('Missing Shopify configuration in callback')
            return NextResponse.redirect(
                `${request.nextUrl.origin}/settings?error=shopify_config_missing`
            )
        }

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

        if (tokenData.error) {
            console.error('Shopify token error:', tokenData)
            return NextResponse.redirect(
                `${request.nextUrl.origin}/settings?error=token_exchange_failed`
            )
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
            console.error('Shopify workspace error:', workspaceError)
            return NextResponse.redirect(
                `${request.nextUrl.origin}/settings?error=workspace_not_found&details=${encodeURIComponent(workspaceError?.message || 'No workspace found for this user.')}`
            )
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
            return NextResponse.redirect(
                `${request.nextUrl.origin}/settings?error=shopify_save_failed&details=${encodeURIComponent(upsertError.message)}`
            )
        }

        return NextResponse.redirect(
            `${request.nextUrl.origin}/settings?success=shopify_connected`
        )
    } catch (error: any) {
        console.error('Shopify callback error:', error)
        return NextResponse.redirect(
            `${request.nextUrl.origin}/settings?error=callback_error&details=${encodeURIComponent(error.message)}`
        )
    }
}
