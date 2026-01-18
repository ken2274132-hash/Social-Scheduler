import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { workspaceId, socialAccountId, caption, scheduledAt, mediaId } = body

        if (!workspaceId || !socialAccountId || !caption || !scheduledAt) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = await createClient()

        // Create post
        const { data: post, error } = await supabase
            .from('posts')
            .insert({
                workspace_id: workspaceId,
                social_account_id: socialAccountId,
                media_id: mediaId,
                caption,
                scheduled_at: scheduledAt,
                status: 'scheduled',
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 })
        }

        // Log the scheduling event
        await supabase.from('post_logs').insert({
            post_id: post.id,
            event: 'scheduled',
            details: { scheduled_at: scheduledAt },
        })

        return NextResponse.json({ post })
    } catch (error: any) {
        console.error('Schedule post error:', error)
        return NextResponse.json({ error: error.message || 'Failed to schedule post' }, { status: 500 })
    }
}
