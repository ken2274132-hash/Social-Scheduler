import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth'
import { errorResponse, clientError } from '@/lib/api'

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY

async function generateWithHuggingFace(prompt: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
    const model = 'stabilityai/stable-diffusion-xl-base-1.0'
    const url = `https://router.huggingface.co/hf-inference/models/${model}`

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: { num_inference_steps: 25, guidance_scale: 7.5 },
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('Hugging Face error:', response.status, errorText)

        if (response.status === 503) {
            try {
                const errorData = JSON.parse(errorText)
                if (errorData.estimated_time) {
                    throw new Error(`Model loading, wait ${Math.ceil(errorData.estimated_time)}s`)
                }
            } catch { /* fall through to the generic error */ }
        }
        throw new Error(`Hugging Face API error: ${response.status}`)
    }

    return { bytes: await response.arrayBuffer(), contentType: 'image/png' }
}

async function generateWithPollinations(prompt: string, width: number, height: number): Promise<{ bytes: ArrayBuffer; contentType: string }> {
    const encodedPrompt = encodeURIComponent(prompt)
    const seed = Math.floor(Math.random() * 1000000)
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`

    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })

    if (!response.ok) {
        throw new Error(`Pollinations error: ${response.status}`)
    }

    return { bytes: await response.arrayBuffer(), contentType: 'image/jpeg' }
}

export async function POST(request: NextRequest) {
    try {
        const { user, db } = await requireAuth()

        const body = await request.json()
        const { prompt, workspaceId, size = '1024x1024' } = body

        if (!prompt || !workspaceId) {
            return clientError('Missing required fields', 400)
        }

        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .eq('owner_id', user.id)
            .maybeSingle()

        if (!workspace) {
            return clientError('Workspace not found or access denied', 403)
        }

        const cleanPrompt = String(prompt).replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000)

        const [width, height] = String(size).split('x').map(Number)
        const finalWidth = Math.min(width || 512, 512)
        const finalHeight = Math.min(height || 512, 512)

        let image: { bytes: ArrayBuffer; contentType: string } | null = null
        let provider = ''

        if (HUGGINGFACE_API_KEY) {
            try {
                image = await generateWithHuggingFace(cleanPrompt)
                provider = 'huggingface'
            } catch (hfError: any) {
                console.log('Hugging Face failed:', hfError.message)
            }
        }

        if (!image) {
            try {
                image = await generateWithPollinations(cleanPrompt, finalWidth, finalHeight)
                provider = 'pollinations'
            } catch (pollinationsError) {
                console.log('Pollinations failed:', pollinationsError)
            }
        }

        if (!image) {
            // Last resort: a stock photo, so the composer still has something usable.
            const promptHash = cleanPrompt.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
            const picsumUrl = `https://picsum.photos/seed/${Math.abs(promptHash)}/${finalWidth}/${finalHeight}`
            const picsumResponse = await fetch(picsumUrl)
            if (!picsumResponse.ok) {
                return clientError('Image generation is temporarily unavailable. Please try again.', 503)
            }
            image = { bytes: await picsumResponse.arrayBuffer(), contentType: 'image/jpeg' }
            provider = 'picsum'
        }

        // Store the image and return a public URL.
        //
        // This must NOT return a data: URL. Instagram, Facebook and Pinterest
        // all fetch media over public HTTP, so a base64 payload would preview
        // fine in the composer and then fail at publish time.
        const extension = image.contentType === 'image/png' ? 'png' : 'jpg'
        // First path segment must be the workspace id — the storage RLS policy
        // checks SPLIT_PART(name, '/', 1) against workspace membership.
        const storagePath = `${workspaceId}/ai-generated/${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await db.storage
            .from('media')
            .upload(storagePath, image.bytes, {
                contentType: image.contentType,
                upsert: false,
            })

        if (uploadError) {
            console.error('Failed to store generated image:', uploadError)
            return clientError('Could not save the generated image. Please try again.', 500)
        }

        const { data: { publicUrl } } = db.storage.from('media').getPublicUrl(storagePath)

        // Register it as a media asset so the composer can schedule it directly.
        const { data: asset, error: assetError } = await db
            .from('media_assets')
            .insert({
                workspace_id: workspaceId,
                storage_path: storagePath,
                url: publicUrl,
                type: 'image',
                file_size_bytes: image.bytes.byteLength,
            })
            .select('id')
            .single()

        if (assetError) {
            console.error('Failed to record media asset:', assetError)
            return clientError('Could not save the generated image. Please try again.', 500)
        }

        return NextResponse.json({
            success: true,
            imageUrl: publicUrl,
            mediaId: asset.id,
            provider,
            ...(provider === 'picsum'
                ? { note: 'AI generation unavailable, showing a placeholder photo' }
                : {}),
        })
    } catch (error) {
        return errorResponse(error, 'ai/image/generate')
    }
}
