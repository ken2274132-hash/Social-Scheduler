import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const { workspaceId, socialAccountId, caption, scheduledAt, mediaId } = body

        if (!workspaceId || !socialAccountId || !caption || !scheduledAt || !mediaId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Double check the user owns this workspace
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .eq('owner_id', user.id)
            .single()

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 })
        }

        // 2. Create the post
        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
                workspace_id: workspaceId,
                social_account_id: socialAccountId,
                media_id: mediaId,
                caption,
                scheduled_at: scheduledAt,
                status: 'scheduled',
            })
            .select()
            .single()

        if (postError) throw postError

        return NextResponse.json({ success: true, post })
    } catch (error: any) {
        console.error('Scheduling error:', error)
        return NextResponse.json({ error: error.message || 'Failed to schedule post' }, { status: 500 })
    }
}
