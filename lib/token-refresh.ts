import { createClient } from '@supabase/supabase-js'
import { pinterestApiBaseUrl } from './pinterest'

/**
 * Automatic OAuth token refresh.
 *
 * Every publish goes through `ensureFreshToken()` so a connection that is
 * about to lapse is renewed before it is used, instead of failing the post and
 * waiting for the user to notice and reconnect by hand.
 *
 * `access_token`, `refresh_token` and `token_expires_at` are SELECT-revoked for
 * the anon and authenticated roles, so everything here — read and write — goes
 * through the service-role client, same as /api/wordpress/posts.
 *
 * Token values are never logged. Log lines carry the account id and platform
 * only.
 */

/** The shape this module needs. `social_accounts(*)` rows satisfy it. */
export interface RefreshableAccount {
    id: string
    platform: string | null
    account_id?: string | null
    access_token: string | null
    refresh_token?: string | null
    token_expires_at?: string | null
}

/**
 * Refresh anything expiring inside this window rather than at the last moment.
 *
 * Meta is the reason the margin is this generous: `fb_exchange_token` only
 * works while the *current* token is still valid, so waiting for the expiry to
 * actually arrive means the connection can never be recovered automatically.
 */
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000

/** Meta long-lived tokens are 60 days, and the response often omits expires_in. */
const META_DEFAULT_LIFETIME_MS = 60 * 24 * 60 * 60 * 1000

/** Message the publish path shows when a connection can no longer be renewed. */
export const RECONNECT_REQUIRED = 'Account needs reconnecting'

/** Set at connect time by the demo/simulation flows — never refresh it. */
const SIMULATOR_TOKEN = 'demo_token_simulator'

function getSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * Two posts for the same account in one cron run would otherwise each kick off
 * their own refresh. Sharing the in-flight promise keeps it to one round trip.
 * Across processes the last write simply wins, which is harmless: both writes
 * are valid tokens for the same account.
 */
const inFlight = new Map<string, Promise<string | null>>()

/**
 * Returns a usable access token for `account`, refreshing it first if it is
 * close to expiry.
 *
 * Returns `null` when the connection is beyond saving — the row is marked
 * inactive and the caller should fail that post with `RECONNECT_REQUIRED`
 * rather than attempting to publish. It never throws into the publish path.
 */
export async function ensureFreshToken(account: RefreshableAccount | null | undefined): Promise<string | null> {
    if (!account) return null

    const platform = account.platform || ''
    const token = account.access_token

    // Simulation mode short-circuits before anything touches a real API.
    if (token === SIMULATOR_TOKEN) return token

    if (!token) {
        await deactivate(account, 'no access token stored')
        return null
    }

    // Application passwords never expire and there is nothing to exchange.
    if (platform === 'wordpress') return token

    // No recorded expiry means we have nothing to judge freshness by. Hand the
    // token over and let the platform be the authority on whether it works.
    if (!account.token_expires_at) return token

    const expiresAt = new Date(account.token_expires_at).getTime()
    if (Number.isNaN(expiresAt)) return token

    if (expiresAt - Date.now() > REFRESH_MARGIN_MS) return token

    const existing = inFlight.get(account.id)
    if (existing) return existing

    const attempt = refresh(account, platform).finally(() => {
        inFlight.delete(account.id)
    })

    inFlight.set(account.id, attempt)
    return attempt
}

async function refresh(account: RefreshableAccount, platform: string): Promise<string | null> {
    try {
        if (platform === 'facebook' || platform === 'instagram') {
            return await refreshMeta(account)
        }
        if (platform === 'pinterest') {
            return await refreshPinterest(account)
        }

        // Unknown platform: nothing to refresh, so pass the token through
        // rather than deactivating a connection we do not understand.
        return account.access_token
    } catch (error: any) {
        // Transport-level failure (DNS, timeout, platform outage). This is not
        // evidence the token is dead, so leave the account active and let the
        // publish attempt produce the real error.
        console.error(
            `Token refresh could not reach ${platform} for account ${account.id}:`,
            error?.message
        )
        return account.access_token
    }
}

/**
 * Meta issues no refresh token. The renewal path is exchanging the current
 * long-lived token for a new long-lived one, which only works while the
 * current one is still valid — hence REFRESH_MARGIN_MS.
 *
 * We store *page* access tokens (see the meta OAuth callback), and the
 * exchange accepts those the same way it accepts user tokens.
 */
async function refreshMeta(account: RefreshableAccount): Promise<string | null> {
    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET

    if (!appId || !appSecret) {
        // A misconfigured server is our fault, not a dead connection — do not
        // deactivate the user's account over it.
        console.error('Missing Meta App credentials — cannot refresh account', account.id)
        return account.access_token
    }

    const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', appId)
    url.searchParams.set('client_secret', appSecret)
    url.searchParams.set('fb_exchange_token', account.access_token!)

    const response = await fetch(url.toString())
    const data = await response.json().catch(() => null)

    if (response.status >= 500) {
        console.error(`Meta refresh got HTTP ${response.status} for account ${account.id} — leaving it active`)
        return account.access_token
    }

    if (!response.ok || !data?.access_token) {
        await deactivate(account, `Meta refused the token exchange: ${data?.error?.message || `HTTP ${response.status}`}`)
        return null
    }

    const lifetimeMs = Number(data.expires_in) > 0
        ? Number(data.expires_in) * 1000
        : META_DEFAULT_LIFETIME_MS

    return persist(account, {
        access_token: data.access_token,
        token_expires_at: new Date(Date.now() + lifetimeMs).toISOString(),
    })
}

/**
 * Standard OAuth2 refresh. Pinterest rotates refresh tokens, so a new one in
 * the response has to be stored or the *next* refresh fails.
 */
async function refreshPinterest(account: RefreshableAccount): Promise<string | null> {
    const clientId = process.env.PINTEREST_APP_ID
    const clientSecret = process.env.PINTEREST_APP_SECRET

    if (!clientId || !clientSecret) {
        console.error('Missing Pinterest App credentials — cannot refresh account', account.id)
        return account.access_token
    }

    if (!account.refresh_token) {
        await deactivate(account, 'no refresh token stored')
        return null
    }

    // Same host the callback minted the token against.
    const apiBaseUrl = pinterestApiBaseUrl()
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch(`${apiBaseUrl}/v5/oauth/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
        }),
    })

    const data = await response.json().catch(() => null)

    if (response.status >= 500) {
        console.error(`Pinterest refresh got HTTP ${response.status} for account ${account.id} — leaving it active`)
        return account.access_token
    }

    if (!response.ok || !data?.access_token) {
        await deactivate(account, `Pinterest refused the refresh: ${data?.message || data?.error || `HTTP ${response.status}`}`)
        return null
    }

    const lifetimeMs = Number(data.expires_in) > 0
        ? Number(data.expires_in) * 1000
        : 30 * 24 * 60 * 60 * 1000

    const update: Record<string, unknown> = {
        access_token: data.access_token,
        token_expires_at: new Date(Date.now() + lifetimeMs).toISOString(),
    }

    // Rotating refresh tokens: only overwrite when a new one actually came back.
    if (data.refresh_token) {
        update.refresh_token = data.refresh_token
    }

    return persist(account, update)
}

/**
 * Writes the renewed credentials back. If the write fails the token itself is
 * still good for this run, so return it and let the next run try again — the
 * only cost is a redundant exchange.
 */
async function persist(account: RefreshableAccount, update: Record<string, unknown>): Promise<string | null> {
    const newToken = update.access_token as string

    try {
        const { error } = await getSupabaseClient()
            .from('social_accounts')
            .update({ ...update, updated_at: new Date().toISOString() })
            .eq('id', account.id)

        if (error) {
            console.error(`Could not store the refreshed token for account ${account.id}:`, error.message)
        } else {
            console.log(`🔑 Refreshed ${account.platform} token for account ${account.id}`)
        }
    } catch (error: any) {
        console.error(`Could not store the refreshed token for account ${account.id}:`, error?.message)
    }

    return newToken
}

/**
 * A connection that cannot be renewed is dead until the user reconnects.
 * Flag it and leave every other column alone, so the reconnect flow has the
 * account name and id to upsert onto.
 */
async function deactivate(account: RefreshableAccount, reason: string): Promise<void> {
    console.error(`🔒 Deactivating ${account.platform} account ${account.id}: ${reason}`)

    try {
        const { error } = await getSupabaseClient()
            .from('social_accounts')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', account.id)

        if (error) {
            console.error(`Could not deactivate account ${account.id}:`, error.message)
        }
    } catch (error: any) {
        console.error(`Could not deactivate account ${account.id}:`, error?.message)
    }
}
