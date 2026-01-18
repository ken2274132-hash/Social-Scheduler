import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userInput, workspaceId } = body

        if (!userInput || !workspaceId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Generate AI content using Groq (super fast!)
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: 'You are a social media expert. Generate engaging Instagram content. Return ONLY valid JSON with: hooks (array of 10 short catchy opening lines), captions (object with short/medium/long versions), hashtags (array of 20-30 relevant hashtags). No markdown, no extra text.'
                },
                {
                    role: 'user',
                    content: `Based on this content: "${userInput}"\n\nGenerate Instagram post variations in this exact JSON format:\n{\n  "hooks": ["hook1", "hook2", ...],\n  "captions": {\n    "short": "50 words max",\n    "medium": "100 words max",\n    "long": "150 words max"\n  },\n  "hashtags": ["#tag1", "#tag2", ...]\n}`
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
        })

        const generation = JSON.parse(completion.choices[0].message.content || '{}')

        return NextResponse.json({
            generation,
        })
    } catch (error: any) {
        console.error('AI generation error:', error)
        return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 })
    }
}
