import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Simple Video Generation API
 * Creates a video from an image with text overlay using canvas-based approach
 * For production, you'd want to use FFmpeg or a cloud service like Cloudinary
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            imageUrl,
            hookLine,
            position = 'top',
            fontSize = 48,
            textColor = '#FFFFFF',
            backgroundColor = 'rgba(0,0,0,0.7)',
            duration = 5
        } = body

        if (!imageUrl || !hookLine) {
            return NextResponse.json({
                error: 'imageUrl and hookLine are required'
            }, { status: 400 })
        }

        // Get user's workspace
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        // For this simple implementation, we'll create a "video" metadata
        // that the frontend can use to overlay text on the image
        // In production, you'd generate actual MP4 using FFmpeg/Remotion

        // Store the video template for reference
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: template, error: insertError } = await serviceClient
            .from('video_templates')
            .insert({
                workspace_id: workspace.id,
                name: `Hook Video - ${new Date().toISOString()}`,
                hook_line: hookLine,
                font_size: fontSize,
                text_color: textColor,
                background_color: backgroundColor,
                position: position,
                duration_seconds: duration,
            })
            .select()
            .single()

        if (insertError) {
            throw insertError
        }

        // Return the video configuration
        // The frontend will use this to display an animated preview
        // For actual video files, you'd need server-side rendering with FFmpeg
        return NextResponse.json({
            success: true,
            templateId: template.id,
            config: {
                imageUrl,
                hookLine,
                position,
                fontSize,
                textColor,
                backgroundColor,
                duration,
            },
            message: 'Video template created. Use this config to display animated overlay.',
            // Instructions for generating actual video (would need FFmpeg setup)
            note: 'For MP4 output, configure FFmpeg on your server or use Cloudinary/Remotion'
        })
    } catch (error: any) {
        console.error('Video generation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * Get video templates for the workspace
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        const { data: templates, error } = await supabase
            .from('video_templates')
            .select('*')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) throw error

        return NextResponse.json({ templates })
    } catch (error: any) {
        console.error('Get templates error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
