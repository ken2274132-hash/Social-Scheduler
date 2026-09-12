import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { newConfirmationCode, verifySignedRequest } from '@/lib/meta-signed-request'

/**
 * Meta's data deletion callback.
 *
 * Registered in the Meta app dashboard under "Data Deletion Request URL". When
 * someone removes Feedquill from their Facebook settings, Meta POSTs here with
 * a signed request naming them, and expects us to actually delete what we hold
 * — then answer with a URL where they can check that we did.
 *
 * Meta reviews this during App Review, and it is the difference between a page
 * that describes deletion and an endpoint that performs it.
 */

export const dynamic = 'force-dynamic'

/** Service role: this runs with no session — the caller is Meta, not a user. */
function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )
}

export async function POST(request: NextRequest) {
    try {
        const appSecret = process.env.META_APP_SECRET
        if (!appSecret) {
            console.error('[data-deletion] META_APP_SECRET is not set')
            return NextResponse.json({ error: 'Not configured' }, { status: 500 })
        }

        // Meta sends this form-encoded, not as JSON. Anything else — an empty
        // body, a JSON probe — throws here rather than parsing, and that is a
        // bad request, not a server fault.
        let signedRequest = ''
        try {
            const form = await request.formData()
            signedRequest = String(form.get('signed_request') || '')
        } catch {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const payload = await verifySignedRequest(signedRequest, appSecret)
        if (!payload?.user_id) {
            // Deliberately vague, and deliberately not 500: a forged request
            // should learn nothing about why it was rejected.
            console.warn('[data-deletion] rejected an unverifiable signed_request')
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const metaUserId = payload.user_id
        const db = admin()
        const confirmationCode = newConfirmationCode()

        // Everything this person connected. Facebook and Instagram both come
        // through the same Meta login, so both are theirs to delete.
        const { data: accounts, error: lookupError } = await db
            .from('social_accounts')
            .select('id')
            .eq('platform_user_id', metaUserId)
            .in('platform', ['facebook', 'instagram'])

        if (lookupError) throw lookupError

        const accountIds = (accounts || []).map((a) => a.id)
        let postsRemoved = 0

        if (accountIds.length > 0) {
            // Posts go first. The foreign key is ON DELETE SET NULL, so
            // removing the accounts first would orphan the posts — leaving the
            // captions and the Facebook post ids behind, which is exactly the
            // data we were asked to delete.
            const { data: removedPosts, error: postsError } = await db
                .from('posts')
                .delete()
                .in('social_account_id', accountIds)
                .select('id')

            if (postsError) throw postsError
            postsRemoved = removedPosts?.length ?? 0

            const { error: accountsError } = await db
                .from('social_accounts')
                .delete()
                .in('id', accountIds)

            if (accountsError) throw accountsError
        }

        await db.from('deletion_requests').insert({
            confirmation_code: confirmationCode,
            platform: 'meta',
            platform_user_id: metaUserId,
            status: accountIds.length > 0 ? 'completed' : 'nothing_to_delete',
            accounts_removed: accountIds.length,
            posts_removed: postsRemoved,
            completed_at: new Date().toISOString(),
        })

        const origin =
            process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
            new URL(request.url).origin

        // The exact shape Meta expects. Anything else is treated as a failure.
        return NextResponse.json({
            url: `${origin}/data-deletion/status?code=${confirmationCode}`,
            confirmation_code: confirmationCode,
        })
    } catch (error) {
        console.error('[data-deletion]', error)
        return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
    }
}

/**
 * Meta does not GET this URL, but people paste it into a browser to see whether
 * it is real. Point them at the page that explains deletion rather than showing
 * a bare 405.
 */
export async function GET(request: NextRequest) {
    return NextResponse.redirect(new URL('/data-deletion', request.url))
}
