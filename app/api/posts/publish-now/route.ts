import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { publishScheduledPosts } from '@/lib/posting-engine'
import { errorResponse, clientError } from '@/lib/api'

export const maxDuration = 60

/**
 * Handle immediate publishing of a post
 * This endpoint allows users to skip the cron job and publish instantly
 */
export async function POST(request: NextRequest) {
    try {
        const { user, db } = await requireAuth()

        const body = await request.json()
        const { postId, workspaceId } = body

        if (!postId || !workspaceId) {
            return clientError('Missing postId or workspaceId', 400)
        }

        // 1. Verify user owns the workspace and the post
        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .eq('owner_id', user.id)
            .maybeSingle()

        if (!workspace) {
            return clientError('Workspace not found or access denied', 403)
        }

        const { data: post } = await db
            .from('posts')
            .select('id')
            .eq('id', postId)
            .eq('workspace_id', workspaceId)
            .maybeSingle()

        if (!post) {
            return clientError('Post not found', 404)
        }

        // 2. Mark it due so the engine picks it up
        await db
            .from('posts')
            .update({
                scheduled_at: new Date().toISOString(),
                status: 'scheduled',
            })
            .eq('id', postId)

        // Publish only this post. Without the id the engine would process every
        // due post across every workspace on this one request.
        await publishScheduledPosts(postId)

        const { data: finalPost } = await db
            .from('posts')
            .select('status, error_message, platform_post_id')
            .eq('id', postId)
            .maybeSingle()

        if (finalPost?.status === 'published') {
            return NextResponse.json({ success: true, platformPostId: finalPost.platform_post_id })
        }

        if (finalPost?.status === 'failed') {
            // This message comes from the social platform and is the actionable
            // part for the user ("token expired", "image too small"), so it is
            // deliberately passed through.
            return NextResponse.json(
                { success: false, error: finalPost.error_message || 'Publishing failed.' },
                { status: 502 }
            )
        }

        return NextResponse.json({ success: true, message: 'Publishing started...' })
    } catch (error) {
        return errorResponse(error, 'posts/publish-now')
    }
}
