import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Development-only auth bypass.
 *
 * Lets you work on the app locally without signing in. It is deliberately
 * impossible to enable in a deployed build: `NODE_ENV` is always 'production'
 * on Vercel, so the flag alone can never open up the live site.
 *
 * Enable by adding to .env.local (which is gitignored):
 *   DEV_BYPASS_AUTH=true
 *   DEV_BYPASS_USER_ID=<uuid of a real user in your Supabase project>
 */
export const DEV_AUTH_BYPASS =
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_BYPASS_AUTH === 'true'

export type AuthedUser = {
    id: string
    email: string | null
    user_metadata?: Record<string, any>
}

export type AuthContext = {
    user: AuthedUser
    /**
     * Use this for all database access. Normally it is the request-scoped
     * client, so RLS still applies. Under the dev bypass there is no session
     * for RLS to key off, so it is the service-role client instead.
     */
    db: SupabaseClient
    bypassed: boolean
}

function serviceClient(): SupabaseClient {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )
}

let warned = false

async function bypassContext(): Promise<AuthContext | null> {
    const db = serviceClient()
    const configuredId = process.env.DEV_BYPASS_USER_ID

    // Fall back to the oldest account so the bypass works with no extra config.
    const query = configuredId
        ? db.from('users').select('id, email').eq('id', configuredId).maybeSingle()
        : db.from('users').select('id, email').order('created_at', { ascending: true }).limit(1).maybeSingle()

    const { data } = await query

    if (!data) {
        console.error(
            '[dev-auth-bypass] No user found' +
            (configuredId ? ` for DEV_BYPASS_USER_ID=${configuredId}.` : ' in public.users.') +
            ' Falling back to real authentication.'
        )
        return null
    }

    if (!warned) {
        warned = true
        console.warn(`[dev-auth-bypass] ACTIVE — every request runs as ${data.email}. Development only.`)
    }

    return {
        user: { id: data.id, email: data.email, user_metadata: {} },
        db,
        bypassed: true,
    }
}

/** Returns the current user, or null when nobody is signed in. */
export async function getAuthContext(): Promise<AuthContext | null> {
    if (DEV_AUTH_BYPASS) {
        const ctx = await bypassContext()
        if (ctx) return ctx
    }

    const supabase = await createClient()
    // getUser() revalidates the JWT with the auth server. getSession() only
    // decodes the cookie and must not be trusted for authorization.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    return {
        user: { id: user.id, email: user.email ?? null, user_metadata: user.user_metadata ?? {} },
        db: supabase,
        bypassed: false,
    }
}

/** Thrown by requireAuth() when there is no valid session. */
export class UnauthorizedError extends Error {
    constructor() {
        super('Unauthorized')
        this.name = 'UnauthorizedError'
    }
}

/** Returns the current user, or throws UnauthorizedError. */
export async function requireAuth(): Promise<AuthContext> {
    const ctx = await getAuthContext()
    if (!ctx) throw new UnauthorizedError()
    return ctx
}

/**
 * Returns the current user and asserts they are a super admin, redirecting
 * otherwise. For use in `app/admin/*` server components.
 *
 * Under the dev bypass the configured user is treated as an admin so /admin is
 * reachable locally without signing in.
 */
export async function requireSuperAdmin(): Promise<AuthContext> {
    const ctx = await getAuthContext()

    if (!ctx) {
        redirect('/login')
    }

    if (ctx.bypassed) return ctx

    const { data: profile } = await ctx.db
        .from('users')
        .select('role')
        .eq('id', ctx.user.id)
        .maybeSingle()

    if (profile?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    return ctx
}
