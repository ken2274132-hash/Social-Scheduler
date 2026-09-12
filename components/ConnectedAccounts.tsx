'use client'

import { Instagram, Facebook, Globe, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

type SocialAccount = {
    id: string
    platform: string
    account_name: string | null
    account_id: string
    profile_picture_url: string | null
    created_at: string
}

const PINTEREST_PATH =
    'M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z'

const PinterestGlyph = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d={PINTEREST_PATH} />
    </svg>
)

/** Brand mark and label for each platform, in one place. */
function platformMeta(platform: string) {
    switch (platform) {
        case 'facebook':
            return { label: 'Facebook Page', color: '#1877F2', glyph: <Facebook size={18} /> }
        case 'pinterest':
            return { label: 'Pinterest Account', color: '#E60023', glyph: <PinterestGlyph /> }
        case 'wordpress':
            return { label: 'WordPress Blog', color: '#21759B', glyph: <Globe size={18} /> }
        default:
            return { label: 'Instagram Account', color: '#E1306C', glyph: <Instagram size={18} /> }
    }
}

export default function ConnectedAccounts({ accounts }: { accounts: SocialAccount[] }) {
    const [loading, setLoading] = useState<string | null>(null)
    // Which row is asking "are you sure?". An inline step rather than the
    // native confirm() dialog, which does not match anything else in the app.
    const [confirming, setConfirming] = useState<string | null>(null)
    const [error, setError] = useState<{ id: string; message: string } | null>(null)

    const handleDisconnect = async (accountId: string) => {
        setLoading(accountId)
        setError(null)
        try {
            // Goes through the API rather than writing here: the browser's role
            // has no UPDATE privilege on social_accounts, so the direct write
            // this used to do failed silently and left the account connected.
            const response = await fetch('/api/accounts/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId }),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => null)
                setError({
                    id: accountId,
                    message: body?.error || 'Could not disconnect. Please try again.',
                })
                return
            }

            window.location.reload()
        } catch {
            setError({ id: accountId, message: 'Could not reach the server. Check your connection.' })
        } finally {
            setLoading(null)
            setConfirming(null)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((account) => {
                const meta = platformMeta(account.platform)
                const isConfirming = confirming === account.id
                const isLoading = loading === account.id
                const rowError = error?.id === account.id ? error.message : null

                return (
                    <div
                        key={account.id}
                        className="group flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-xl shadow-sm shadow-slate-200/30 dark:shadow-none hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                    >
                        {/* Avatar. A blog has no social profile picture worth
                            showing, so every source falls back to its mark. */}
                        <div className="relative shrink-0">
                            {account.profile_picture_url && account.platform !== 'wordpress' ? (
                                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                                    <Image
                                        src={account.profile_picture_url}
                                        alt={account.account_name || meta.label}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                    style={{ backgroundColor: meta.color }}
                                >
                                    {meta.glyph}
                                </div>
                            )}
                            <div
                                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800"
                                style={{ color: meta.color }}
                                aria-hidden
                            >
                                {account.platform === 'facebook' ? (
                                    <Facebook size={9} />
                                ) : account.platform === 'pinterest' ? (
                                    <PinterestGlyph size={9} />
                                ) : account.platform === 'wordpress' ? (
                                    <Globe size={9} />
                                ) : (
                                    <Instagram size={9} />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {account.account_name || meta.label}
                            </p>
                            {rowError ? (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{rowError}</p>
                            ) : (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {meta.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        {isConfirming ? (
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => handleDisconnect(account.id)}
                                    disabled={isLoading}
                                    className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Removing…' : 'Remove'}
                                </button>
                                <button
                                    onClick={() => setConfirming(null)}
                                    disabled={isLoading}
                                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setError(null)
                                    setConfirming(account.id)
                                }}
                                className="p-2 shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label={`Disconnect ${account.account_name || meta.label}`}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
