import { NextRequest, NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Where every link in an auth email lands: signup confirmation, password reset,
 * email change.
 *
 * This has to be a server route rather than a page. `@supabase/ssr` uses the
 * PKCE flow, where the browser that started the signup holds a verifier in its
 * own storage — so a link opened on a phone, or in a different browser, or from
 * a mail client's in-app viewer, has nothing to exchange and silently fails.
 * Verifying the token hash server-side works wherever the link is opened, and
 * sets the session as cookies on the way through.
 *
 * The email templates point here (see docs/EMAIL_TEMPLATES.md). Without them
 * Supabase falls back to its own verify endpoint and the project's Site URL,
 * which is how a confirmation email ends up pointing at a host nobody
 * recognises.
 */

export const dynamic = 'force-dynamic'

/** Only our own paths. An open redirect here would be handed to users by email. */
function safeNext(value: string | null): string {
    if (!value) return '/dashboard'
    // Must be a single-slash absolute path: "//evil.com" is a protocol-relative
    // URL that browsers happily treat as another origin.
    if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
    return value
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)

    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = safeNext(searchParams.get('next'))

    if (!tokenHash || !type) {
        return NextResponse.redirect(`${origin}/login?error=invalid_link`)
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (error) {
        // Overwhelmingly this is an expired or already-used link, and that is
        // worth saying plainly — a generic failure sends people to support.
        console.warn('[auth/confirm]', type, error.message)
        return NextResponse.redirect(`${origin}/login?error=link_expired`)
    }

    return NextResponse.redirect(`${origin}${next}`)
}
