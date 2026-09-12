import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse, clientError } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * Edit an existing post.
 *
 * Mirrors `posts/schedule` exactly — same body shape plus `postId`, same auth,
 * workspace-ownership, social-account and media checks — but UPDATEs the row
 * instead of inserting a new one. A post that has already gone out (or is
 * going out right now) is not editable: rewriting its caption here would not
 * change what is live on the platform, so we refuse rather than lie.
 */

/** Statuses past the point of no return. */
const UNEDITABLE_STATUSES = ['published', 'publishing']

export async function POST(request: NextRequest) {
    try {
        const { user, db } = await requireAuth()

        const limited = await enforceRateLimit(request, 'write', user.id)
        if (limited) return limited

        const body = await request.json()
        const { postId, workspaceId, socialAccountId, caption, scheduledAt } = body

        // `mediaUrl` is accepted for callers that already have a hosted image
        // and have no asset row for it yet. `mediaId` is used when one exists.
        let mediaId: string | undefined = body.mediaId
        const mediaUrl: string | undefined = body.mediaUrl

        if (!postId || !workspaceId || !socialAccountId || !caption || !scheduledAt) {
            return clientError('Missing required fields', 400)
        }

        if (!mediaId && !mediaUrl) {
            return clientError('A post needs an image or video.', 400)
        }

        // 1. Double check the user owns this workspace
        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .eq('owner_id', user.id)
            .maybeSingle()

        if (!workspace) {
            return clientError('Workspace not found or access denied', 403)
        }

        // 2. The post has to live in that same workspace
        const { data: existingPost } = await db
            .from('posts')
            .select('id, status')
            .eq('id', postId)
            .eq('workspace_id', workspaceId)
            .maybeSingle()

        if (!existingPost) {
            return clientError('Post not found in this workspace', 404)
        }

        if (UNEDITABLE_STATUSES.includes(existingPost.status)) {
            return clientError(
                existingPost.status === 'published'
                    ? 'This post has already been published and can no longer be edited.'
                    : 'This post is being published right now and can no longer be edited.',
                409
            )
        }

        // 3. Make sure the social account belongs to that workspace too
        const { data: account } = await db
            .from('social_accounts')
            .select('id')
            .eq('id', socialAccountId)
            .eq('workspace_id', workspaceId)
            .maybeSingle()

        if (!account) {
            return clientError('Social account not found in this workspace', 403)
        }

        // 4. Resolve the media asset
        if (mediaId) {
            const { data: existing } = await db
                .from('media_assets')
                .select('id')
                .eq('id', mediaId)
                .eq('workspace_id', workspaceId)
                .maybeSingle()

            if (!existing) {
                return clientError('Media not found in this workspace', 403)
            }
        } else {
            if (!/^https:\/\//i.test(mediaUrl!)) {
                // The platforms fetch media over public HTTPS, so anything else
                // would only fail later, at publish time.
                return clientError('Image must be a public https:// URL.', 400)
            }

            const { data: asset, error: assetError } = await db
                .from('media_assets')
                .insert({
                    workspace_id: workspaceId,
                    storage_path: '',
                    url: mediaUrl,
                    type: 'image',
                })
                .select('id')
                .single()

            if (assetError) {
                console.error('Failed to create media asset:', assetError)
                return clientError('Could not attach the image to this post.', 500)
            }
            mediaId = asset.id
        }

        // 5. Apply the edit. A post that previously failed goes back into the
        // queue, which is the whole point of fixing it.
        const { data: post, error: postError } = await db
            .from('posts')
            .update({
                social_account_id: socialAccountId,
                media_id: mediaId,
                caption,
                scheduled_at: scheduledAt,
                status: 'scheduled',
            })
            .eq('id', postId)
            .eq('workspace_id', workspaceId)
            .select()
            .single()

        if (postError) throw postError

        return NextResponse.json({ success: true, post })
    } catch (error) {
        return errorResponse(error, 'posts/update')
    }
}
