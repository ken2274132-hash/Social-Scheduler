import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Fetch products from connected Shopify store
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's workspace
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        // Get Shopify account - use service role to read access token
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: shopifyAccount, error: shopifyError } = await serviceClient
            .from('shopify_accounts')
            .select('*')
            .eq('workspace_id', workspace.id)
            .single()

        if (shopifyError || !shopifyAccount) {
            return NextResponse.json({
                error: 'Shopify not connected',
                connected: false
            }, { status: 404 })
        }

        // Fetch products from Shopify
        const limit = request.nextUrl.searchParams.get('limit') || '50'
        const cursor = request.nextUrl.searchParams.get('cursor') || ''

        let url = `https://${shopifyAccount.shop_domain}/admin/api/2024-01/products.json?limit=${limit}`
        if (cursor) {
            url += `&page_info=${cursor}`
        }

        const productsResponse = await fetch(url, {
            headers: {
                'X-Shopify-Access-Token': shopifyAccount.access_token,
            },
        })

        if (!productsResponse.ok) {
            const errorText = await productsResponse.text()
            console.error('Shopify API error:', errorText)
            return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
        }

        const productsData = await productsResponse.json()

        // Extract next page cursor from Link header
        const linkHeader = productsResponse.headers.get('Link')
        let nextCursor = null
        if (linkHeader) {
            const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]*)[^>]*>; rel="next"/)
            if (nextMatch) {
                nextCursor = nextMatch[1]
            }
        }

        // Transform products to simpler format
        const products = productsData.products.map((product: any) => ({
            id: product.id.toString(),
            title: product.title,
            description: product.body_html?.replace(/<[^>]*>/g, '') || '',
            image: product.image?.src || product.images?.[0]?.src || null,
            images: product.images?.map((img: any) => img.src) || [],
            price: product.variants?.[0]?.price || '0.00',
            compareAtPrice: product.variants?.[0]?.compare_at_price,
            vendor: product.vendor,
            productType: product.product_type,
            handle: product.handle,
            url: `https://${shopifyAccount.shop_domain}/products/${product.handle}`,
        }))

        return NextResponse.json({
            products,
            nextCursor,
            shopName: shopifyAccount.shop_name,
            connected: true,
        })
    } catch (error: any) {
        console.error('Shopify products error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
