'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

/**
 * Why a link from an email failed, in words the person can act on.
 *
 * /auth/confirm sends people here with one of these when a token will not
 * verify. Without it they land on a plain login form having clicked a button
 * that looked like it should have worked, and nothing on screen admits that
 * anything went wrong.
 */
const LINK_ERRORS: Record<string, string> = {
    link_expired:
        'That link has expired or was already used. Request a new one below.',
    invalid_link:
        'That link is incomplete — mail apps sometimes cut long links in half. Try opening it again, or request a new one.',
}

/**
 * Supabase's own wording, rewritten to say what to do about it.
 *
 * "Invalid login credentials" is technically accurate and tells nobody whether
 * to retype the password or check they signed up at all. It stays deliberately
 * vague about WHICH field was wrong — saying "no account with that email" would
 * let anyone test whether a given address is registered here.
 */
function loginErrorMessage(raw: string): string {
    const message = raw.toLowerCase()

    if (message.includes('email not confirmed')) {
        return 'Confirm your email first — check your inbox for the link we sent when you signed up.'
    }
    if (message.includes('invalid login credentials')) {
        return 'That email and password do not match. Check both, or reset your password below.'
    }
    if (message.includes('rate limit') || message.includes('too many')) {
        return 'Too many attempts. Wait a minute and try again.'
    }
    return raw || 'Could not sign you in. Try again.'
}

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [needsConfirmation, setNeedsConfirmation] = useState(false)
    const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

    // Read straight from the URL rather than useSearchParams, which would force
    // this statically rendered page behind a Suspense boundary for one string.
    useEffect(() => {
        const reason = new URLSearchParams(window.location.search).get('error')
        if (reason && LINK_ERRORS[reason]) setError(LINK_ERRORS[reason])
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError

            router.push('/dashboard')
        } catch (err: any) {
            const raw = err?.message || ''
            setError(loginErrorMessage(raw))
            // Only this case has a useful next step on this page, so the resend
            // button appears for it and nothing else.
            setNeedsConfirmation(raw.toLowerCase().includes('email not confirmed'))
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setResendState('sending')
        try {
            const supabase = createClient()
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
                },
            })
            if (resendError) throw resendError
            setResendState('sent')
        } catch {
            setResendState('idle')
            setError('Could not send another email. Try again in a minute.')
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-4 relative">
            <Link
                href="/"
                className="absolute top-8 left-8 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={16} />
                Back to home
            </Link>
            <div className="max-w-md w-full space-y-8">
                {/* Logo */}
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                        <div className="w-10 h-10 bg-orange-700 rounded-lg flex items-center justify-center text-white">
                            FQ
                        </div>
                        Feedquill
                    </Link>
                    <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sign in to your account to continue
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                            {needsConfirmation && (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={resendState !== 'idle'}
                                    className="block mt-2 font-medium underline underline-offset-2 disabled:no-underline disabled:opacity-70"
                                >
                                    {resendState === 'sending'
                                        ? 'Sending...'
                                        : resendState === 'sent'
                                            ? 'Sent — check your inbox'
                                            : 'Send the confirmation email again'}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 rounded accent-orange-700 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-400">
                                Remember me
                            </label>
                        </div>

                        <Link href="/forgot-password" className="text-sm text-orange-700 hover:text-orange-800 font-medium">
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-orange-700 hover:bg-orange-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>

                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Don't have an account?{' '}
                        <Link href="/signup" className="text-orange-700 hover:text-orange-800 font-medium">
                            Create one now
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
