import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'

/**
 * Best-effort request rate limiting.
 *
 * The counters live in this process's memory. On Vercel each serverless
 * instance has its own, so the real ceiling is roughly `limit x instances`
 * rather than `limit`. That is a deliberate trade for a zero-dependency,
 * zero-cost limiter: it stops a single client hammering an endpoint (the case
 * that actually costs us money on the AI routes) without adding Redis.
 *
 * When a shared backend is wanted later, implement `RateLimitStore` against it
 * and pass it to `setRateLimitStore()`. The store methods may return promises,
 * so a network-backed store drops in without changing a single call site.
 */

// ---------------------------------------------------------------------------
// Limits — tune these, nothing else.
// ---------------------------------------------------------------------------

type Rule = {
    /** Maximum requests allowed inside the window. */
    limit: number
    /** Window length in milliseconds. */
    windowMs: number
}

type GroupConfig = {
    /**
     * 'user' keys by the authenticated user id and falls back to the client IP
     * when the caller is anonymous. 'ip' always keys by IP — for routes that
     * run before (or without) a session, like OAuth starts and callbacks.
     */
    keyBy: 'user' | 'ip'
    /** All rules must pass. The first one that fails shapes the 429. */
    rules: Rule[]
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

export const RATE_LIMITS = {
    /** AI generation. Each call spends real money upstream, so keep it tight. */
    ai: {
        keyBy: 'user',
        rules: [
            { limit: 10, windowMs: MINUTE },
            { limit: 100, windowMs: HOUR },
        ],
    },

    /** OAuth starts and callbacks. Unauthenticated abuse surface. */
    oauth: {
        keyBy: 'ip',
        rules: [{ limit: 10, windowMs: MINUTE }],
    },

    /** Publishing and scheduling. Writes that fan out to third-party APIs. */
    write: {
        keyBy: 'user',
        rules: [{ limit: 30, windowMs: MINUTE }],
    },

    /** Plain reads. Generous — this only exists to stop runaway clients. */
    read: {
        keyBy: 'user',
        rules: [{ limit: 60, windowMs: MINUTE }],
    },
} satisfies Record<string, GroupConfig>

export type RateLimitGroup = keyof typeof RATE_LIMITS

/** Longest window we track, so pruning never drops a hit a rule still needs. */
const RETAIN_MS = Math.max(
    ...Object.values(RATE_LIMITS as Record<string, GroupConfig>)
        .flatMap((group) => group.rules.map((rule) => rule.windowMs))
)

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/**
 * Hit timestamps per key. Swap the implementation to move the counters
 * somewhere shared; every method may return a promise.
 */
export interface RateLimitStore {
    /** Hit timestamps (ms) for `key`, oldest first. */
    get(key: string): number[] | undefined | Promise<number[] | undefined>
    set(key: string, timestamps: number[]): void | Promise<void>
}

/** In-process store. Survives Next's dev hot reload via globalThis. */
class MemoryStore implements RateLimitStore {
    private readonly buckets: Map<string, number[]>
    private writes = 0

    constructor() {
        const globals = globalThis as typeof globalThis & {
            __rateLimitBuckets?: Map<string, number[]>
        }
        globals.__rateLimitBuckets ??= new Map()
        this.buckets = globals.__rateLimitBuckets
    }

    get(key: string) {
        return this.buckets.get(key)
    }

    set(key: string, timestamps: number[]) {
        this.buckets.set(key, timestamps)

        // Sweep occasionally so idle keys do not accumulate for the life of
        // the instance. Cheap because expired keys hold only stale numbers.
        if (++this.writes % 500 === 0) {
            const cutoff = Date.now() - RETAIN_MS
            for (const [existing, hits] of this.buckets) {
                if (!hits.length || hits[hits.length - 1] <= cutoff) {
                    this.buckets.delete(existing)
                }
            }
        }
    }
}

let store: RateLimitStore = new MemoryStore()

/** Replace the backend (Redis, Postgres, …) without touching call sites. */
export function setRateLimitStore(next: RateLimitStore) {
    store = next
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * The client IP. Vercel puts the real client first in `x-forwarded-for`;
 * everything after it is proxy hops and must not be trusted.
 */
export function clientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const first = forwarded?.split(',')[0]?.trim()
    if (first) return first

    return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

async function resolveKey(
    request: Request,
    group: RateLimitGroup,
    userId?: string | null
): Promise<string> {
    if (RATE_LIMITS[group].keyBy === 'ip') {
        return `ip:${clientIp(request)}`
    }

    if (userId) return `user:${userId}`

    // No id handed in — look one up rather than lumping every signed-in user
    // on a shared NAT into one bucket.
    const ctx = await getAuthContext().catch(() => null)
    if (ctx) return `user:${ctx.user.id}`

    return `ip:${clientIp(request)}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Records a request and decides whether it is allowed.
 *
 * Returns `null` when the caller is under the limit, or a ready-to-return 429
 * `NextResponse` when they are not. Call it before any expensive work:
 *
 *   const limited = await enforceRateLimit(request, 'ai', user.id)
 *   if (limited) return limited
 *
 * Pass `userId` when the route has already authenticated — it saves this
 * helper from resolving the session a second time.
 */
export async function enforceRateLimit(
    request: Request,
    group: RateLimitGroup,
    userId?: string | null
): Promise<NextResponse | null> {
    const config: GroupConfig = RATE_LIMITS[group]

    let key: string
    try {
        key = `${group}:${await resolveKey(request, group, userId)}`
    } catch {
        // Never let the limiter be the reason a request fails.
        return null
    }

    const now = Date.now()

    let hits: number[]
    try {
        hits = ((await store.get(key)) ?? []).filter((at) => at > now - RETAIN_MS)
    } catch (error) {
        console.error('[rate-limit] store read failed', error)
        return null
    }

    for (const rule of config.rules) {
        const inWindow = hits.filter((at) => at > now - rule.windowMs)
        if (inWindow.length < rule.limit) continue

        // Over the limit. Do not record this hit — otherwise a client that
        // keeps hammering would never fall back inside the window.
        const resetAt = inWindow[0] + rule.windowMs
        const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000))

        return NextResponse.json(
            { error: `Too many requests. Please try again in ${retryAfter}s.` },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(rule.limit),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
                },
            }
        )
    }

    hits.push(now)

    try {
        // Bound the array even if a rule is later raised a long way.
        await store.set(key, hits.slice(-1000))
    } catch (error) {
        console.error('[rate-limit] store write failed', error)
    }

    return null
}
