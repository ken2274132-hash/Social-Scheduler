import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishScheduledPosts } from '@/lib/posting-engine'

/**
 * Handle immediate publishing of a post
 * This endpoint allows users to skip the cron job and publish instantly
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const { postId, workspaceId } = body

        if (!postId || !workspaceId) {
            return NextResponse.json({ error: 'Missing postId or workspaceId' }, { status: 400 })
        }

        // 1. Verify user owns the workspace and the post
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

        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .eq('workspace_id', workspaceId)
            .single()

        if (postError || !post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        // 2. Set post status to scheduled for NOW so the engine picks it up
        // or just call the engine directly for this specific post.
        // Let's modify the engine to optionally take a specific post ID.

        // For now, we'll update the scheduled_at to the past and status to 'scheduled'
        // and then trigger the engine.
        await supabase
            .from('posts')
            .update({
                scheduled_at: new Date().toISOString(),
                status: 'scheduled'
            })
            .eq('id', postId)

        // Trigger the publishing logic
        // We can import the same function used by the cron
        await publishScheduledPosts()

        // Check the final status of the post
        const { data: finalPost } = await supabase
            .from('posts')
            .select('status, error_message, platform_post_id')
            .eq('id', postId)
            .single()

        if (finalPost?.status === 'published') {
            return NextResponse.json({ success: true, platformPostId: finalPost.platform_post_id })
        } else if (finalPost?.status === 'failed') {
            return NextResponse.json({ success: false, error: finalPost.error_message }, { status: 500 })
        } else {
            return NextResponse.json({ success: true, message: 'Publishing started...' })
        }

    } catch (error: any) {
        console.error('Publish now error:', error)
        return NextResponse.json({ error: error.message || 'Failed to publish now' }, { status: 500 })
    }
}
