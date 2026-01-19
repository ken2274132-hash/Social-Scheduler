'use client'

import { Instagram, Trash2 } from 'lucide-react'
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
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white">
                                <Instagram size={24} />
                            </div>
                        )}
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {account.account_name || 'Instagram Account'}
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
