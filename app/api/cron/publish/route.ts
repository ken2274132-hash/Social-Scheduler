import { NextResponse } from 'next/server'
import { publishScheduledPosts } from '@/lib/posting-engine'

/**
 * Cron endpoint for publishing scheduled posts
 * Called by external cron service (cron-job.org) every minute
 */

export async function GET() {
    try {
        await publishScheduledPosts()
        // Return minimal text response for cron-job.org
        return new Response('OK', { status: 200 })
    } catch (error: any) {
        console.error('Cron error:', error.message)
        return new Response('ERROR', { status: 500 })
    }
}
