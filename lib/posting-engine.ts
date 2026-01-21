import { createClient } from '@supabase/supabase-js'

/**
 * Instagram Auto-Posting Function
 * 
 * This function is triggered by a cron job (every minute) to check for
 * scheduled posts that need to be published.
 * 
 * DEPLOYMENT OPTIONS:
 * 1. Supabase Edge Function with pg_cron
 * 2. Vercel Cron Job (vercel.json config)
 * 3. External cron service hitting /api/cron/publish
 */

function getSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function publishScheduledPosts() {
    const supabase = getSupabaseClient()
    try {
        // Get posts that are scheduled for now or earlier
        const now = new Date().toISOString()

        const { data: posts, error: fetchError } = await supabase
            .from('posts')
            .select('*, social_accounts(*), media_assets(*)')
            .eq('status', 'scheduled')
            .lte('scheduled_at', now)
            .order('scheduled_at', { ascending: true })
            .limit(10) // Process max 10 at a time

        if (fetchError || !posts || posts.length === 0) {
            console.log('No posts to publish')
            return
        }

        console.log(`Found ${posts.length} posts to publish`)

        for (const post of posts) {
            try {
                // Update status to publishing
                await supabase
                    .from('posts')
                    .update({ status: 'publishing' })
                    .eq('id', post.id)

                // Log publishing attempt
                await supabase.from('post_logs').insert({
                    post_id: post.id,
                    event: 'publishing_started',
                    details: { timestamp: new Date().toISOString() },
                })

                // Check if token is expired
                if (post.social_accounts.token_expires_at) {
                    const expiresAt = new Date(post.social_accounts.token_expires_at)
                    if (expiresAt < new Date()) {
                        throw new Error('Social account token expired. Please reconnect.')
                    }
                }

                // Route by platform
                let result;
                if (post.social_accounts.platform === 'facebook') {
                    result = await publishToFacebook(
                        post,
                        post.social_accounts.access_token
                    )
                } else if (post.social_accounts.platform === 'pinterest') {
                    result = await publishToPinterest(
                        post,
                        post.social_accounts.access_token
                    )
                } else {
                    result = await publishToInstagram(
                        post,
                        post.social_accounts.access_token
                    )
                }

                if (result.success) {
                    // Update post status to published
                    await supabase
                        .from('posts')
                        .update({
                            status: 'published',
                            platform_post_id: result.postId,
                            published_at: new Date().toISOString(),
                        })
                        .eq('id', post.id)

                    // Log success
                    await supabase.from('post_logs').insert({
                        post_id: post.id,
                        event: 'published',
                        details: { platform_post_id: result.postId },
                    })

                    console.log(`✅ Published post ${post.id}`)
                } else {
                    throw new Error(result.error)
                }
            } catch (error: any) {
                console.error(`❌ Failed to publish post ${post.id}:`, error.message)

                // Update post status to failed
                await supabase
                    .from('posts')
                    .update({
                        status: 'failed',
                        error_message: error.message,
                    })
                    .eq('id', post.id)

                // Log failure
                await supabase.from('post_logs').insert({
                    post_id: post.id,
                    event: 'failed',
                    details: { error: error.message },
                })
            }
        }
    } catch (error) {
        console.error('Publishing cron error:', error)
    }
}

async function publishToInstagram(post: any, accessToken: string) {
    try {
        // Simulation Mode Check
        if (accessToken === 'demo_token_simulator') {
            console.log('🚀 SIMULATION MODE: Publishing post...')
            await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate network delay
            return {
                success: true,
                postId: `ig_demo_${Math.random().toString(36).substring(7)}`,
            }
        }

        const igUserId = post.social_accounts.account_id
        const caption = post.caption
        const mediaUrl = post.media_assets?.url
        const mediaType = post.media_assets?.type // 'image' or 'video'

        if (!mediaUrl) {
            throw new Error('No media attached to post')
        }

        // Step 1: Create media container
        const payload: any = {
            caption: caption,
            access_token: accessToken,
        }

        if (mediaType === 'video') {
            payload.video_url = mediaUrl
            payload.media_type = 'VIDEO'
        } else {
            payload.image_url = mediaUrl
        }

        const containerResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igUserId}/media`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }
        )

        const containerData = await containerResponse.json()

        if (containerData.error) {
            throw new Error(containerData.error.message)
        }

        const creationId = containerData.id

        // Step 2: For videos, we need to wait for processing
        if (mediaType === 'video') {
            let status = 'IN_PROGRESS'
            let attempts = 0
            while (status !== 'FINISHED' && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5s
                const statusResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${creationId}?fields=status_code&access_token=${accessToken}`
                )
                const statusData = await statusResponse.json()
                status = statusData.status_code
                attempts++
                if (status === 'ERROR') throw new Error('Video processing failed on Instagram')
            }
            if (status !== 'FINISHED') throw new Error('Video processing timed out')
        }

        // Step 3: Publish the container
        const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: creationId,
                    access_token: accessToken,
                }),
            }
        )

        const publishData = await publishResponse.json()

        if (publishData.error) {
            throw new Error(publishData.error.message)
        }

        return {
            success: true,
            postId: publishData.id,
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        }
    }
}
async function publishToFacebook(post: any, accessToken: string) {
    try {
        // Simulation Mode Check
        if (accessToken === 'demo_token_simulator') {
            console.log('🚀 SIMULATION MODE: Publishing to Facebook...')
            await new Promise(resolve => setTimeout(resolve, 2000))
            return {
                success: true,
                postId: `fb_demo_${Math.random().toString(36).substring(7)}`,
            }
        }

        const pageId = post.social_accounts.account_id
        const message = post.caption
        const mediaUrl = post.media_assets?.url
        const mediaType = post.media_assets?.type // 'image' or 'video'

        let endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`
        const payload: any = {
            message: message,
            access_token: accessToken,
        }

        if (mediaUrl) {
            if (mediaType === 'video') {
                endpoint = `https://graph.facebook.com/v21.0/${pageId}/videos`
                payload.file_url = mediaUrl
                payload.description = message
            } else {
                endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`
                payload.url = mediaUrl
                payload.caption = message
            }
        }

        const publishResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        const publishData = await publishResponse.json()

        if (publishData.error) {
            throw new Error(publishData.error.message)
        }

        return {
            success: true,
            postId: publishData.id || publishData.post_id,
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        }
    }
}

async function publishToPinterest(post: any, accessToken: string) {
    try {
        // Simulation Mode Check
        if (accessToken === 'demo_token_simulator') {
            console.log('🚀 SIMULATION MODE: Publishing to Pinterest...')
            await new Promise(resolve => setTimeout(resolve, 2000))
            return {
                success: true,
                postId: `pin_demo_${Math.random().toString(36).substring(7)}`,
            }
        }

        const mediaUrl = post.media_assets?.url
        const caption = post.caption || ''

        if (!mediaUrl) {
            throw new Error('No media attached to post')
        }

        // First, we need to get user's boards to post to
        // For now, we'll create a Pin without specifying a board (goes to profile)
        // In a full implementation, you'd let users select a board

        const pinPayload: any = {
            title: caption.substring(0, 100), // Pinterest title max 100 chars
            description: caption,
            link: post.media_assets?.product_url || process.env.NEXT_PUBLIC_APP_URL,
            media_source: {
                source_type: 'image_url',
                url: mediaUrl,
            },
        }

        // If we have a board_id stored in post metadata, use it
        if (post.pinterest_board_id) {
            pinPayload.board_id = post.pinterest_board_id
        }

        const pinResponse = await fetch('https://api.pinterest.com/v5/pins', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pinPayload),
        })

        const pinData = await pinResponse.json()

        if (pinData.code || pinData.message) {
            // Pinterest API returns error in code/message format
            throw new Error(pinData.message || 'Pinterest API error')
        }

        return {
            success: true,
            postId: pinData.id,
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        }
    }
}
