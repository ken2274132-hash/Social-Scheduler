import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { wpHeaders } from '@/lib/wordpress'

/**
 * Blog posts from the connected WordPress site, for repurposing into social
 * posts. This is the mirror of /api/shopify/products: a content *source*, not
 * a publishing target.
 *
 * The application password lives in `social_accounts.access_token`, which is
 * SELECT-revoked for anon and authenticated, so reading it needs the service
 * role — same as the Shopify route.
 */

const TIMEOUT_MS = 15_000

/** WordPress returns rendered HTML with entities; social captions want text. */
function toPlainText(html: string): string {
    return (html || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;|&#8217;/g, "'")
        .replace(/&hellip;/g, '…')
        .replace(/&#\d+;/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

export async function GET(request: NextRequest) {
    try {
        const { user, db } = await requireAuth()

        const limited = await enforceRateLimit(request, 'read', user.id)
        if (limited) return limited

        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!workspace) {
            return NextResponse.json({ connected: false, posts: [] })
        }

        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: account } = await serviceClient
            .from('social_accounts')
            .select('account_id, account_name, access_token')
            .eq('workspace_id', workspace.id)
            .eq('platform', 'wordpress')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!account?.account_id || !account.access_token) {
            return NextResponse.json({ connected: false, posts: [] })
        }

        const perPage = Math.min(
            Number(request.nextUrl.searchParams.get('limit')) || 20,
            50
        )
        const page = Math.max(Number(request.nextUrl.searchParams.get('page')) || 1, 1)

        // _embed brings the featured image back in the same request rather than
        // one extra round trip per post.
        const url =
            `${account.account_id}/wp-json/wp/v2/posts` +
            `?per_page=${perPage}&page=${page}&status=publish&_embed=wp:featuredmedia`

        const response = await fetch(url, {
            headers: { ...wpHeaders(account.access_token), Accept: 'application/json' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        }).catch(() => null)

        if (!response) {
            return NextResponse.json(
                { connected: true, posts: [], error: 'Could not reach your WordPress site.' },
                { status: 502 }
            )
        }

        if (!response.ok) {
            console.error('[wordpress/posts]', response.status, await response.text())
            return NextResponse.json(
                { connected: true, posts: [], error: 'WordPress did not return your posts.' },
                { status: 502 }
            )
        }

        const raw = await response.json()

        const posts = (Array.isArray(raw) ? raw : []).map((post: any) => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]
            return {
                id: String(post.id),
                title: toPlainText(post.title?.rendered || 'Untitled'),
                excerpt: toPlainText(post.excerpt?.rendered || ''),
                url: post.link as string,
                date: post.date as string,
                image:
                    media?.media_details?.sizes?.large?.source_url ||
                    media?.source_url ||
                    null,
            }
        })

        return NextResponse.json({
            connected: true,
            siteName: account.account_name,
            // WordPress reports the real page count in a header, which is the
            // only reliable way to know whether another page exists.
            totalPages: Number(response.headers.get('X-WP-TotalPages') || 1),
            posts,
        })
    } catch (error) {
        return errorResponse(error, 'wordpress/posts')
    }
}
