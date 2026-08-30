import { NextResponse } from 'next/server'
import { UnauthorizedError } from '@/lib/auth'

/**
 * Columns of `social_accounts` that are safe to send to the browser.
 *
 * Never use `select('*')` on this table from a server component or a route
 * whose result reaches the client: the row also holds `access_token` and
 * `refresh_token`, and React serializes client-component props into the HTML.
 */
export const SOCIAL_ACCOUNT_PUBLIC_COLUMNS =
    'id, workspace_id, platform, account_name, account_id, profile_picture_url, is_active, token_expires_at, created_at, updated_at'

/** Same list, for use inside a nested PostgREST embed: `posts.select(...)`. */
export const SOCIAL_ACCOUNT_EMBED =
    `social_accounts(${SOCIAL_ACCOUNT_PUBLIC_COLUMNS})`

/**
 * Turns a thrown error into a response that says what went wrong without
 * leaking vendor names, model ids, SQL detail or upstream error text.
 */
export function errorResponse(error: unknown, context: string, fallbackStatus = 500) {
    if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Full detail stays in the server log, where it is useful and not public.
    console.error(`[${context}]`, error)

    return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: fallbackStatus }
    )
}

/** A client-safe error with a message we have deliberately chosen to expose. */
export function clientError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status })
}
