import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Pinterest OAuth - Step 1: Initiate
 * Redirects user to Pinterest to authorize our app
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const clientId = process.env.PINTEREST_APP_ID
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || ''
        const redirectUri = `${baseUrl}/api/auth/callback/pinterest`

        // Pinterest scopes for reading/writing pins and boards
        const scopes = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read'

        // Encode user ID in state for callback
        const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64')

        const authUrl = `https://www.pinterest.com/oauth/?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `state=${state}`

        return NextResponse.redirect(authUrl)
    } catch (error: any) {
        console.error('Pinterest auth error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
