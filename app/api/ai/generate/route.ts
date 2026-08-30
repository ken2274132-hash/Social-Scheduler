import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { requireAuth } from '@/lib/auth'
import { errorResponse, clientError } from '@/lib/api'

/**
 * Models are tried in order. Groq retires models with little notice, so a
 * `model_not_found` on the first one falls through to the next rather than
 * taking the whole feature offline.
 */
const MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']

const SYSTEM_PROMPT =
    'You are a social media expert. Generate engaging Instagram content. Return ONLY valid JSON with: ' +
    'hooks (array of 10 short catchy opening lines), captions (object with short/medium/long versions), ' +
    'hashtags (array of 20-30 relevant hashtags). No markdown, no extra text.'

const MAX_INPUT_CHARS = 4000

export async function POST(request: NextRequest) {
    try {
        const { user, db } = await requireAuth()

        const body = await request.json()
        const { userInput, workspaceId } = body

        if (!userInput || !workspaceId) {
            return clientError('Missing required fields', 400)
        }

        if (typeof userInput !== 'string' || userInput.length > MAX_INPUT_CHARS) {
            return clientError(`Content must be text under ${MAX_INPUT_CHARS} characters.`, 400)
        }

        // Confirm the caller actually owns the workspace they named.
        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .eq('owner_id', user.id)
            .maybeSingle()

        if (!workspace) {
            return clientError('Workspace not found or access denied', 403)
        }

        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
            console.error('GROQ_API_KEY is not set')
            return clientError('AI generation is not configured.', 503)
        }

        const groq = new Groq({ apiKey })

        let lastError: any = null

        for (const model of MODELS) {
            try {
                const completion = await groq.chat.completions.create({
                    model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        {
                            role: 'user',
                            content: `Based on this content: "${userInput}"\n\nGenerate Instagram post variations in this exact JSON format:\n{\n  "hooks": ["hook1", "hook2", ...],\n  "captions": {\n    "short": "50 words max",\n    "medium": "100 words max",\n    "long": "150 words max"\n  },\n  "hashtags": ["#tag1", "#tag2", ...]\n}`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.8,
                })

                const generation = JSON.parse(completion.choices[0]?.message?.content || '{}')
                return NextResponse.json({ generation })
            } catch (err: any) {
                lastError = err
                const retryable =
                    err?.status === 404 ||
                    err?.status === 400 ||
                    /model_not_found|does not exist|decommissioned/i.test(err?.message || '')

                if (!retryable) throw err
                console.warn(`Groq model "${model}" unavailable, trying the next one.`)
            }
        }

        throw lastError ?? new Error('No AI model available')
    } catch (error) {
        return errorResponse(error, 'ai/generate')
    }
}
