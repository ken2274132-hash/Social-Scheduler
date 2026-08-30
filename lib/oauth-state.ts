import crypto from 'crypto'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * CSRF protection for OAuth flows.
 *
 * The `state` parameter round-trips through the provider and comes back under
 * the attacker's control, so nothing inside it can be trusted on its own.
 * We pair it with a random nonce stored in an httpOnly cookie: the callback
 * only proceeds if the returned state matches a flow this browser started.
 *
 * Anything we need on the way back (user id, workspace id) is kept in the
 * cookie, not in the state, so the provider never sees it and the client
 * cannot tamper with it.
 */

const COOKIE_PREFIX = 'oauth_state_'
const MAX_AGE_SECONDS = 60 * 10 // a user has 10 minutes to finish the flow

export type OAuthStatePayload = {
    userId: string
    workspaceId?: string
    platform?: string
}

function cookieName(provider: string) {
    return `${COOKIE_PREFIX}${provider}`
}

/**
 * Starts a flow. Returns the opaque `state` value to send to the provider,
 * and stores the payload plus nonce in an httpOnly cookie.
 */
export async function createOAuthState(
    provider: string,
    payload: OAuthStatePayload
): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('base64url')
    const cookieStore = await cookies()

    cookieStore.set(cookieName(provider), JSON.stringify({ nonce, ...payload }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // must survive the provider's top-level redirect back
        path: '/',
        maxAge: MAX_AGE_SECONDS,
    })

    return nonce
}

/**
 * Finishes a flow. Returns the stored payload if `state` matches the nonce we
 * issued, otherwise null. The cookie is cleared either way, so a state value
 * can never be replayed.
 */
export async function consumeOAuthState(
    request: NextRequest,
    provider: string,
    state: string | null
): Promise<OAuthStatePayload | null> {
    const name = cookieName(provider)
    const raw = request.cookies.get(name)?.value

    const cookieStore = await cookies()
    const clear = () => {
        try {
            cookieStore.delete(name)
        } catch {
            // Deleting from a redirect response is best-effort; the short
            // maxAge above bounds the lifetime regardless.
        }
    }

    if (!raw || !state) {
        clear()
        return null
    }

    let stored: { nonce?: string } & OAuthStatePayload
    try {
        stored = JSON.parse(raw)
    } catch {
        clear()
        return null
    }

    clear()

    if (!stored.nonce || !stored.userId) return null

    const a = Buffer.from(stored.nonce, 'utf8')
    const b = Buffer.from(state, 'utf8')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        console.error(`OAuth state mismatch for provider "${provider}"`)
        return null
    }

    return { userId: stored.userId, workspaceId: stored.workspaceId, platform: stored.platform }
}
