import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, clientError } from '@/lib/api'

/**
 * API Route to create a simulation/demo Instagram account
 * This allows testing the platform without a real Meta App setup
 */
export async function POST(request: NextRequest) {
    try {
        // Simulator accounts are a development aid, not a product feature.
        if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_ACCOUNTS !== 'true') {
            return clientError('Demo accounts are not available.', 404)
        }

        const supabase = await createClient()

        // Safely parse request body
        let workspaceId: string | undefined
        try {
            const body = await request.text()
            if (body) {
                const parsed = JSON.parse(body)
                workspaceId = parsed.workspaceId
            }
        } catch {
            // Body parsing failed, we'll try to get workspace from user
        }

        // Verify ownership
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return clientError('Unauthorized', 401)

        // Get user's workspace (create if doesn't exist)
        let { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        // If no workspace exists, create one
        if (!workspace) {
            const { data: newWorkspace, error: wsError } = await supabase
                .from('workspaces')
                .insert({ name: 'Default Workspace', owner_id: user.id })
                .select()
                .single()

            if (wsError) return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
            workspace = newWorkspace
        }

        if (!workspace) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

        const actualWorkspaceId = workspace.id

        // One simulator account per workspace: this used to insert a new row on
        // every call, with no cap.
        const { data: existingDemo } = await supabase
            .from('social_accounts')
            .select('id')
            .eq('workspace_id', actualWorkspaceId)
            .eq('access_token', 'demo_token_simulator')
            .limit(1)
            .maybeSingle()

        if (existingDemo) {
            return clientError('This workspace already has a demo account.', 409)
        }

        // Create Demo Account
        const demoId = `demo_${Math.random().toString(36).substring(7)}`
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .insert({
                workspace_id: actualWorkspaceId,
                platform: 'instagram',
                account_name: 'Demo Account (Simulator)',
                account_id: demoId,
                access_token: 'demo_token_simulator',
                profile_picture_url: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=100&h=100&fit=crop',
                is_active: true
            })
            .select()
            .single()

        if (accountError) throw accountError

        return NextResponse.json({ success: true, account })
    } catch (error) {
        return errorResponse(error, 'social/demo')
    }
}
