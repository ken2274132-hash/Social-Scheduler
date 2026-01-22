import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

        const apiKey = process.env.OPENAI_API_KEY

        // IF NO API KEY, RETURN MOCK IMAGE FOR DEMO PURPOSES
        if (!apiKey || apiKey === 'your-openai-api-key') {
            console.warn('OPENAI_API_KEY is missing. Returning placeholder image.')
            const keywords = prompt.split(' ').slice(0, 3).join(',')
            return NextResponse.json({
                success: true,
                imageUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1024&auto=format&fit=crop&keywords=${encodeURIComponent(keywords)}`,
                isPlaceholder: true,
                message: 'OPENAI_API_KEY not configured. Showing example image based on keywords.'
            })
        }

        const openai = new OpenAI({
            apiKey: apiKey,
        })

        // Generate Image using DALL-E 3
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: size as any,
            quality: "standard",
            response_format: "url"
        })

        const imageUrl = response.data?.[0]?.url

        if (!imageUrl) {
            throw new Error('Failed to generate image URL')
        }

        // Ideally, we'd download the image and upload it to Supabase storage
        // But for now, we'll return the OpenAI URL (which expires in 1 hour)
        // and handle the transfer in the frontend or a separate function

        return NextResponse.json({
            success: true,
            imageUrl,
        })

    } catch (error: any) {
        console.error('AI Image generation error:', error)
        return NextResponse.json({
            error: error.message || 'Failed to generate image'
        }, { status: 500 })
    }
}
