import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Get Shopify connection status
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (!workspace) {
            return NextResponse.json({ connected: false })
        }

        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: shopifyAccount } = await serviceClient
            .from('shopify_accounts')
            .select('shop_name, shop_domain, created_at')
            .eq('workspace_id', workspace.id)
            .single()

        if (!shopifyAccount) {
            return NextResponse.json({ connected: false })
        }

        return NextResponse.json({
            connected: true,
            shopName: shopifyAccount.shop_name,
            shopDomain: shopifyAccount.shop_domain,
            connectedAt: shopifyAccount.created_at,
        })
    } catch (error: any) {
        console.error('Shopify status error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * Disconnect Shopify store
 */
export async function DELETE() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await serviceClient
            .from('shopify_accounts')
            .delete()
            .eq('workspace_id', workspace.id)

        if (error) {
            throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Shopify disconnect error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
