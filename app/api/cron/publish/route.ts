import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { publishScheduledPosts } from '@/lib/posting-engine'
import { DEV_AUTH_BYPASS } from '@/lib/auth'

/**
 * Cron endpoint for publishing scheduled posts.
 *
 * Called by Vercel Cron (see vercel.json) or an external cron service.
 * Both send `Authorization: Bearer <CRON_SECRET>`.
 */

export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
    if (DEV_AUTH_BYPASS) return true

    const secret = process.env.CRON_SECRET
    if (!secret) {
        console.error('CRON_SECRET is not set — refusing to run the publish cron.')
        return false
    }

    const header = request.headers.get('authorization') || ''
    const expected = `Bearer ${secret}`

    const a = Buffer.from(header, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        await publishScheduledPosts()
        // Return minimal text response for cron services
        return new Response('OK', { status: 200 })
    } catch (error: any) {
        console.error('Cron error:', error?.message)
        return new Response('ERROR', { status: 500 })
    }
}
