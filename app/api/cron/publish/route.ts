import { NextResponse } from 'next/server'
import { publishScheduledPosts } from '@/lib/posting-engine'

/**
 * Cron endpoint for publishing scheduled posts
 * 
 * This should be called by:
 * - Vercel Cron (if deployed on Vercel)
 * - External cron service (like cron-job.org)
 * - Supabase Edge Function with pg_cron
 * 
 * Recommended: Run every minute
 */

export async function GET(request: Request) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await publishScheduledPosts()

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Cron endpoint error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
