import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY

async function generateWithHuggingFace(prompt: string): Promise<ArrayBuffer> {
    // Using a fast, reliable model
    const model = 'stabilityai/stable-diffusion-xl-base-1.0'
    const url = `https://router.huggingface.co/hf-inference/models/${model}`

    console.log('Generating with Hugging Face:', model)

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                num_inference_steps: 25,
                guidance_scale: 7.5,
            }
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('Hugging Face error:', response.status, errorText)

        // Check if model is loading
        if (response.status === 503) {
            const errorData = JSON.parse(errorText)
            if (errorData.estimated_time) {
                throw new Error(`Model loading, wait ${Math.ceil(errorData.estimated_time)}s`)
            }
        }
        throw new Error(`Hugging Face API error: ${response.status}`)
    }

    return response.arrayBuffer()
}

async function generateWithPollinations(prompt: string, width: number, height: number): Promise<ArrayBuffer> {
    const encodedPrompt = encodeURIComponent(prompt)
    const seed = Math.floor(Math.random() * 1000000)
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`

    console.log('Fetching from Pollinations:', url)

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    })

    if (!response.ok) {
        throw new Error(`Pollinations error: ${response.status}`)
    }

    return response.arrayBuffer()
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { prompt, workspaceId, size = "1024x1024" } = body

        if (!prompt || !workspaceId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Clean the prompt
        const cleanPrompt = prompt
            .replace(/[\n\r]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        // Parse size
        const [width, height] = size.split('x').map(Number)
        const finalWidth = Math.min(width || 512, 512)
        const finalHeight = Math.min(height || 512, 512)

        // Try Hugging Face first (reliable + free tier)
        if (HUGGINGFACE_API_KEY) {
            try {
                const imageBuffer = await generateWithHuggingFace(cleanPrompt)
                const base64Image = Buffer.from(imageBuffer).toString('base64')
                const dataUrl = `data:image/png;base64,${base64Image}`

                console.log('Hugging Face image generated, size:', imageBuffer.byteLength)

                return NextResponse.json({
                    success: true,
                    imageUrl: dataUrl,
                    provider: 'huggingface'
                })
            } catch (hfError: any) {
                console.log('Hugging Face failed:', hfError.message)
                // Continue to fallback
            }
        }

        // Fallback to Pollinations
        try {
            const imageBuffer = await generateWithPollinations(cleanPrompt, finalWidth, finalHeight)
            const base64Image = Buffer.from(imageBuffer).toString('base64')
            const dataUrl = `data:image/jpeg;base64,${base64Image}`

            console.log('Pollinations image generated, size:', imageBuffer.byteLength)

            return NextResponse.json({
                success: true,
                imageUrl: dataUrl,
                provider: 'pollinations'
            })
        } catch (pollinationsError) {
            console.log('Pollinations failed:', pollinationsError)
        }

        // Final fallback to Picsum (stock photos)
        const promptHash = cleanPrompt.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
        const picsumUrl = `https://picsum.photos/seed/${Math.abs(promptHash)}/${finalWidth}/${finalHeight}`

        console.log('Fetching from Picsum:', picsumUrl)

        const picsumResponse = await fetch(picsumUrl)

        if (!picsumResponse.ok) {
            throw new Error('All image services failed')
        }

        const imageBuffer = await picsumResponse.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')
        const dataUrl = `data:image/jpeg;base64,${base64Image}`

        return NextResponse.json({
            success: true,
            imageUrl: dataUrl,
            provider: 'picsum',
            note: 'AI generation unavailable, showing placeholder photo'
        })

    } catch (error: any) {
        console.error('AI Image generation error:', error)
        return NextResponse.json({
            error: error.message || 'Failed to generate image'
        }, { status: 500 })
    }
}
