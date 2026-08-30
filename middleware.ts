import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Development-only auth bypass. Mirrors the check in lib/auth.ts.
 *
 * NODE_ENV is always 'production' in a deployed build, so this can never be
 * switched on for the live site by setting an environment variable.
 */
const DEV_AUTH_BYPASS =
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_BYPASS_AUTH === 'true'

export async function middleware(request: NextRequest) {
    // Skip middleware if Supabase env vars are not configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return NextResponse.next()
    }

    // Local development without signing in: let every route through.
    if (DEV_AUTH_BYPASS) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // getUser() revalidates the JWT with the auth server. getSession() only
    // decodes the cookie, which is not safe to authorize on.
    const { data: { user } } = await supabase.auth.getUser()

    // Protected routes
    const protectedPaths = ['/dashboard', '/composer', '/calendar', '/settings', '/analytics', '/workflow', '/admin']
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isProtectedPath && !user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
    }

    // Redirect authenticated users away from auth pages
    const authPaths = ['/login', '/signup']
    const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isAuthPath && user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
    }

    // Admin route protection
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
    if (isAdminPath && user) {
        const { data: userData } = await supabase
            .from('users')
            .select('role, status')
            .eq('id', user.id)
            .single()

        // Block banned users
        if (userData?.status === 'banned') {
            await supabase.auth.signOut()
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/login'
            redirectUrl.searchParams.set('error', 'Your account has been suspended')
            return NextResponse.redirect(redirectUrl)
        }

        // Redirect non-admins to dashboard
        if (userData?.role !== 'super_admin') {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/dashboard'
            return NextResponse.redirect(redirectUrl)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        // API routes authorize themselves, so skip them here rather than
        // paying an extra session round-trip on every request.
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
