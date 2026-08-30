import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse, clientError } from '@/lib/api'

export async function POST(request: NextRequest) {
    try {
        const { user, db } = await requireAuth()

        const body = await request.json()
        const { workspaceId, socialAccountId, caption, scheduledAt } = body

        // `mediaUrl` is accepted for callers that already have a hosted image
        // (the workflow builder, Shopify product images) and have no asset row
        // for it yet. `mediaId` is used when one already exists.
        let mediaId: string | undefined = body.mediaId
        const mediaUrl: string | undefined = body.mediaUrl

        if (!workspaceId || !socialAccountId || !caption || !scheduledAt) {
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

        // 2. Make sure the social account belongs to that workspace too
        const { data: account } = await db
            .from('social_accounts')
            .select('id')
            .eq('id', socialAccountId)
            .eq('workspace_id', workspaceId)
            .maybeSingle()

        if (!account) {
            return clientError('Social account not found in this workspace', 403)
        }

        // 3. Resolve the media asset
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

        // 4. Create the post
        const { data: post, error: postError } = await db
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
    } catch (error) {
        return errorResponse(error, 'posts/schedule')
    }
}
