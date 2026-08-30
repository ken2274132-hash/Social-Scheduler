'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Lock, CheckCircle2, Loader2 } from 'lucide-react'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const [linkState, setLinkState] = useState<'checking' | 'valid' | 'invalid'>('checking')

    // Supabase puts the recovery token in the URL fragment and the client picks
    // it up automatically, emitting PASSWORD_RECOVERY once the session is set.
    useEffect(() => {
        const supabase = createClient()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setLinkState('valid')
            }
        })

        supabase.auth.getSession().then(({ data: { session } }: any) => {
            setLinkState((current) => {
                if (current === 'valid') return current
                return session ? 'valid' : 'invalid'
            })
        })

        return () => subscription?.unsubscribe()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
            return
        }
        if (password !== confirmPassword) {
            setError('The two passwords do not match.')
            return
        }

        setLoading(true)
        try {
            const supabase = createClient()
            const { error: updateError } = await supabase.auth.updateUser({ password })
            if (updateError) throw updateError

            setDone(true)
            setTimeout(() => router.push('/dashboard'), 2000)
        } catch (err: any) {
            setError(err.message || 'Could not update your password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-4 relative">
            <Link
                href="/login"
                className="absolute top-8 left-8 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={16} />
                Back to login
            </Link>

            <div className="w-full max-w-sm">
                {done ? (
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                            Password updated
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Taking you to your dashboard…
                        </p>
                    </div>
                ) : linkState === 'checking' ? (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Checking your reset link…
                    </div>
                ) : linkState === 'invalid' ? (
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                            This link has expired
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Reset links can only be used once, and expire after an hour. Request a new one to continue.
                        </p>
                        <Link
                            href="/forgot-password"
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Send a new link
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                                <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                Choose a new password
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Pick something at least {MIN_PASSWORD_LENGTH} characters long.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    New password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    Confirm new password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                {loading ? 'Updating…' : 'Update password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
