'use client'

import { Globe } from 'lucide-react'
import { useState } from 'react'

/**
 * WordPress connects with a form rather than an OAuth redirect: the user pastes
 * their site address, username and an application password. Because the whole
 * flow happens here, this component has to explain where that password comes
 * from — most people have never opened that screen.
 */
export default function ConnectWordPressButton({ workspaceId }: { workspaceId: string }) {
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [siteUrl, setSiteUrl] = useState('')
    const [username, setUsername] = useState('')
    const [appPassword, setAppPassword] = useState('')

    const canSubmit = siteUrl.trim() && username.trim() && appPassword.trim() && !loading

    const handleConnect = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/wordpress/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteUrl, username, appPassword }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Could not connect that site.')
                return
            }

            window.location.href = '/settings?success=wordpress_connected'
        } catch {
            setError('Could not reach the server. Check your connection and try again.')
        } finally {
            setLoading(false)
        }
    }

    const close = () => {
        setShowModal(false)
        setError(null)
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#21759B] hover:bg-[#1A5F7F] text-white rounded-lg font-medium text-sm transition-colors"
            >
                <Globe size={20} />
                Connect WordPress
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            Connect WordPress
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                            For self-hosted WordPress sites. In WordPress, go to
                            {' '}<span className="font-medium text-gray-800 dark:text-gray-200">Users → Profile → Application Passwords</span>,
                            create one named &ldquo;Scheduler&rdquo;, and paste it below.
                        </p>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4 mb-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Site address
                                </label>
                                <input
                                    type="text"
                                    value={siteUrl}
                                    onChange={(e) => setSiteUrl(e.target.value)}
                                    placeholder="myblog.com"
                                    autoComplete="off"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#21759B] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    WordPress username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="admin"
                                    autoComplete="off"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#21759B] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Application password
                                </label>
                                <input
                                    type="password"
                                    value={appPassword}
                                    onChange={(e) => setAppPassword(e.target.value)}
                                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                                    autoComplete="off"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#21759B] focus:border-transparent font-mono text-sm"
                                />
                                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    Not your login password. Spaces are fine.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={close}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConnect}
                                disabled={!canSubmit}
                                className="flex-1 px-4 py-2 bg-[#21759B] hover:bg-[#1A5F7F] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Checking…' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
