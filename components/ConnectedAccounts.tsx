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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account) => (
                <div
                    key={account.id}
                    className="group relative flex items-center justify-between p-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-100 dark:border-gray-800/60 rounded-[2rem] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden"
                >
                    <div className="flex items-center gap-5 relative z-10">
                        {account.profile_picture_url ? (
                            <div className="relative w-16 h-16 p-1 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 shadow-lg group-hover:scale-105 transition-transform duration-500">
                                <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-gray-900">
                                    <Image
                                        src={account.profile_picture_url}
                                        alt={account.account_name || 'Profile'}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border-2 border-gray-50 dark:border-gray-900 shadow-sm transition-transform group-hover:scale-110">
                                    {account.platform === 'facebook' ? (
                                        <Facebook size={12} className="text-[#1877F2]" />
                                    ) : account.platform === 'pinterest' ? (
                                        <div className="text-[#E60023]"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg></div>
                                    ) : (
                                        <Instagram size={12} className="text-pink-500" />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="hover:scale-105 transition-transform duration-500">
                                {getPlatformIcon(account.platform)}
                            </div>
                        )}
                        <div>
                            <p className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {account.account_name || getPlatformLabel(account.platform)}
                            </p>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-1.5 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                Active Connection
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => handleDisconnect(account.id)}
                        disabled={loading === account.id}
                        className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[1.5rem] transition-all relative z-10 group/btn"
                        aria-label="Disconnect account"
                    >
                        <Trash2 size={20} className="group-hover/btn:rotate-12 transition-transform" />
                    </button>

                    {/* Subtle Background Accent */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
                </div>
            ))}
        </div>
    )
}
