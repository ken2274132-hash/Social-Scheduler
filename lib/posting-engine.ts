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

/**
 * Publishes due posts.
 *
 * Pass `onlyPostId` to publish exactly one post — the "publish now" endpoint
 * uses this so a single user's click cannot publish other workspaces' posts.
 */
export async function publishScheduledPosts(onlyPostId?: string) {
    const supabase = getSupabaseClient()
    try {
        // Get posts that are scheduled for now or earlier
        const now = new Date().toISOString()

        let query = supabase
            .from('posts')
            .select('*, social_accounts(*), media_assets(*)')
            .eq('status', 'scheduled')

        if (onlyPostId) {
            query = query.eq('id', onlyPostId)
        } else {
            query = query.lte('scheduled_at', now)
        }

        const { data: posts, error: fetchError } = await query
            .order('scheduled_at', { ascending: true })
            .limit(onlyPostId ? 1 : 25)

        if (fetchError || !posts || posts.length === 0) {
            return
        }

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
                } else if (post.social_accounts.platform === 'wordpress') {
                    result = await publishToWordPress(
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
            // Simulation mode
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

        // Build Pinterest payload - link is optional and must be a valid public URL
        const productUrl = post.media_assets?.product_url
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        const isValidLink = (url: string | undefined) =>
            url && !url.includes('localhost') && (url.startsWith('https://') || url.startsWith('http://'))

        const pinPayload: any = {
            title: caption.substring(0, 100), // Pinterest title max 100 chars
            description: caption,
            media_source: {
                source_type: 'image_url',
                url: mediaUrl,
            },
        }

        // Only add link if it's a valid public URL (not localhost)
        if (isValidLink(productUrl)) {
            pinPayload.link = productUrl
        } else if (isValidLink(appUrl)) {
            pinPayload.link = appUrl
        }

        // If we have a board_id stored in post metadata, use it
        if (post.pinterest_board_id) {
            pinPayload.board_id = post.pinterest_board_id
        }

        // Use sandbox for trial apps, production for approved apps
        const apiBaseUrl = process.env.PINTEREST_API_BASE_URL || 'https://api-sandbox.pinterest.com'
        const pinResponse = await fetch(`${apiBaseUrl}/v5/pins`, {
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

/**
 * Self-hosted WordPress.
 *
 * `accessToken` here is the base64 `username:application-password` built at
 * connect time, and `account_id` is the site origin. See lib/wordpress.ts.
 *
 * Posts in this app carry a caption but no separate title, so the first line
 * of the caption becomes the post title and the remainder becomes the body.
 * A single-line caption is used for both.
 */
async function publishToWordPress(post: any, credential: string) {
    try {
        if (credential === 'demo_token_simulator') {
            console.log('🚀 SIMULATION MODE: Publishing to WordPress...')
            await new Promise(resolve => setTimeout(resolve, 2000))
            return {
                success: true,
                postId: `wp_demo_${Math.random().toString(36).substring(7)}`,
            }
        }

        const origin = post.social_accounts.account_id
        if (!origin) {
            throw new Error('This WordPress account has no site address. Reconnect it.')
        }

        const auth = { Authorization: `Basic ${credential}` }
        const caption: string = post.caption || ''
        const [firstLine, ...rest] = caption.split('\n')
        const title = (firstLine || 'Untitled').trim().slice(0, 200)
        const bodyText = rest.join('\n').trim() || caption

        // Media first: WordPress wants an attachment id, not a URL, and the
        // upload has to carry the bytes rather than a link to them.
        let featuredMediaId: number | undefined
        const mediaUrl = post.media_assets?.url

        if (mediaUrl) {
            const imageResponse = await fetch(mediaUrl)
            if (!imageResponse.ok) {
                throw new Error('Could not read the attached image.')
            }

            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
            const bytes = await imageResponse.arrayBuffer()
            const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'
            const filename = `post-${post.id}.${extension}`

            const uploadResponse = await fetch(`${origin}/wp-json/wp/v2/media`, {
                method: 'POST',
                headers: {
                    ...auth,
                    'Content-Type': contentType,
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
                body: bytes,
            })

            const uploadText = await uploadResponse.text()
            if (!uploadResponse.ok) {
                throw new Error(`WordPress rejected the image upload (${uploadResponse.status}).`)
            }

            featuredMediaId = JSON.parse(uploadText).id
        }

        const payload: Record<string, unknown> = {
            title,
            content: bodyText.replace(/\n/g, '<br />'),
            status: 'publish',
        }
        if (featuredMediaId) payload.featured_media = featuredMediaId

        const createResponse = await fetch(`${origin}/wp-json/wp/v2/posts`, {
            method: 'POST',
            headers: { ...auth, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        const createText = await createResponse.text()
        if (!createResponse.ok) {
            let detail = `HTTP ${createResponse.status}`
            try {
                const parsed = JSON.parse(createText)
                if (parsed?.message) detail = parsed.message
            } catch {
                // WordPress errors are not always JSON — a security plugin
                // returning an HTML block page is the usual reason.
            }
            throw new Error(`WordPress refused the post: ${detail}`)
        }

        return {
            success: true,
            postId: String(JSON.parse(createText).id),
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        }
    }
}
