'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MailCheck } from 'lucide-react'

export default function SignupPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    /** Set once the confirmation email is away — swaps the form for instructions. */
    const [sentTo, setSentTo] = useState<string | null>(null)
    const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

    const confirmRedirect = () =>
        `${window.location.origin}/auth/confirm?next=/dashboard`

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                    // Without this, Supabase builds the confirmation link from
                    // the project's Site URL in the dashboard — which is how a
                    // signup email ends up pointing at localhost or an old host.
                    // Deriving it from the current origin keeps local, preview
                    // and production each sending links to themselves.
                    emailRedirectTo: confirmRedirect(),
                },
            })

            if (signUpError) throw signUpError

            // A session only comes back when email confirmation is switched off.
            // With it on — which is the case here — there is a user but no
            // session, and pushing to /dashboard just bounced off the middleware
            // back to /login, so the whole signup looked like it had failed and
            // nothing ever mentioned the email.
            if (data.session) {
                router.push('/dashboard')
                return
            }

            setSentTo(email)
        } catch (err: any) {
            setError(err.message || 'An error occurred during signup')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (!sentTo) return
        setResendState('sending')
        setError(null)
        try {
            const supabase = createClient()
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: sentTo,
                options: { emailRedirectTo: confirmRedirect() },
            })
            if (resendError) throw resendError
            setResendState('sent')
        } catch (err: any) {
            setResendState('idle')
            setError(err.message || 'Could not send another email. Try again in a minute.')
        }
    }

    if (sentTo) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-4 relative">
                <Link
                    href="/"
                    className="absolute top-8 left-8 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to home
                </Link>

                <div className="max-w-md w-full text-center">
                    <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto text-orange-700 dark:text-orange-400">
                        <MailCheck size={26} />
                    </div>

                    <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                        Check your email
                    </h2>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        We sent a confirmation link to{' '}
                        <span className="font-medium text-gray-900 dark:text-white">{sentTo}</span>.
                        Open it to finish setting up your account.
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                        It can take a minute to arrive, and it sometimes lands in spam.
                    </p>

                    {error && (
                        <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm text-left">
                            {error}
                        </div>
                    )}

                    <div className="mt-8 space-y-3">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendState !== 'idle'}
                            className="w-full py-3 px-4 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {resendState === 'sending'
                                ? 'Sending...'
                                : resendState === 'sent'
                                    ? 'Sent — check your inbox again'
                                    : 'Send it again'}
                        </button>

                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Wrong address?{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setSentTo(null)
                                    setResendState('idle')
                                    setError(null)
                                }}
                                className="text-orange-700 hover:text-orange-800 font-medium"
                            >
                                Start over
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        )
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
                        Create your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Start automating your social media today
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSignup} className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Full Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
                                placeholder="John Doe"
                            />
                        </div>

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
                                minLength={6}
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Must be at least 6 characters
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-orange-700 hover:bg-orange-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>

                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link href="/login" className="text-orange-700 hover:text-orange-800 font-medium">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
