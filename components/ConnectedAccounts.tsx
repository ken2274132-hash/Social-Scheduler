'use client'

import { Instagram, Facebook, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

type SocialAccount = {
    id: string
    platform: string
    account_name: string | null
    account_id: string
    profile_picture_url: string | null
    created_at: string
}

export default function ConnectedAccounts({ accounts }: { accounts: SocialAccount[] }) {
    const [loading, setLoading] = useState<string | null>(null)

    const handleDisconnect = async (accountId: string) => {
        if (!confirm('Are you sure you want to disconnect this account?')) return

        setLoading(accountId)
        try {
            const supabase = createClient()
            await supabase
                .from('social_accounts')
                .update({ is_active: false })
                .eq('id', accountId)

            window.location.reload()
        } catch (error) {
            alert('Failed to disconnect account')
        } finally {
            setLoading(null)
        }
    }

    const getPlatformIcon = (platform: string) => {
        if (platform === 'facebook') {
            return (
                <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                    <Facebook size={24} />
                </div>
            )
        }
        if (platform === 'pinterest') {
            return (
                <div className="w-12 h-12 rounded-full bg-[#E60023] flex items-center justify-center text-white">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                    </svg>
                </div>
            )
        }
        return (
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <Instagram size={24} />
            </div>
        )
    }

    const getPlatformLabel = (platform: string) => {
        if (platform === 'facebook') return 'Facebook Page'
        if (platform === 'pinterest') return 'Pinterest Account'
        return 'Instagram Account'
    }

    return (
        <div className="space-y-3">
            {accounts.map((account) => (
                <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {account.profile_picture_url ? (
                            <div className="relative w-12 h-12">
                                <Image
                                    src={account.profile_picture_url}
                                    alt={account.account_name || 'Profile'}
                                    fill
                                    className="rounded-full object-cover"
                                    unoptimized // Meta URLs can have expiration/complex params, sometimes best to leave resizing to their CDN but still use Next.js for lazy loading
                                />
                            </div>
                        ) : (
                            getPlatformIcon(account.platform)
                        )}
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {account.account_name || getPlatformLabel(account.platform)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Connected {new Date(account.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => handleDisconnect(account.id)}
                        disabled={loading === account.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Disconnect account"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            ))}
        </div>
    )
}
