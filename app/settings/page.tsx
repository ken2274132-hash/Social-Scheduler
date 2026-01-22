import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConnectInstagramButton from '@/components/ConnectInstagramButton'
import ConnectFacebookButton from '@/components/ConnectFacebookButton'
import ConnectPinterestButton from '@/components/ConnectPinterestButton'
import ConnectShopifyButton from '@/components/ConnectShopifyButton'
import DemoAccountButton from '@/components/DemoAccountButton'
import ConnectedAccounts from '@/components/ConnectedAccounts'
import ShopifyStatus from '@/components/ShopifyStatus'
import DashboardLayout from '@/components/DashboardLayout'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const error = params.error as string
    const details = params.details as string
    const success = params.success as string
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user's workspaces
    let { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

    // Create a workspace if none exists
    let currentWorkspace = workspaces?.[0]
    if (!currentWorkspace) {
        const { data: newWorkspace } = await supabase
            .from('workspaces')
            .insert({
                name: 'Default Workspace',
                owner_id: user.id
            })
            .select()
            .single()
        currentWorkspace = newWorkspace
    }

    // Get connected social accounts
    const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', currentWorkspace?.id || '')
        .eq('is_active', true)

    return (
        <DashboardLayout currentPage="settings">
            <div className="max-w-6xl mx-auto space-y-10">
                <header className="relative flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-10 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.6)]" />
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                            Settings
                        </h1>
                    </div>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-6">
                        Configure your command center and integrations
                    </p>
                </header>

                {error && (
                    <div className="group relative overflow-hidden p-6 rounded-[2rem] bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 backdrop-blur-xl animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-start gap-4 text-red-600 dark:text-red-400 relative z-10">
                            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center shrink-0">
                                <AlertCircle size={24} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-tight">
                                    Connection Error
                                </p>
                                <p className="text-xs font-bold opacity-80 leading-relaxed">
                                    {error === 'no_pages' && 'No Facebook Pages found. You need a Facebook Page to connect Instagram.'}
                                    {error === 'no_instagram' && 'No Instagram Professional account linked to this Facebook Page.'}
                                    {error === 'oauth_denied' && 'Connection cancelled or denied.'}
                                    {error === 'connection_failed' && 'Failed to connect. Please try again.'}
                                    {error === 'config_error' && 'Environment configuration error. Check META_APP_ID and META_APP_SECRET.'}
                                    {error === 'invalid_state' && 'Invalid session state. Please try again.'}
                                    {!['no_pages', 'no_instagram', 'oauth_denied', 'connection_failed', 'config_error', 'invalid_state'].includes(error) && 'An unexpected error occurred.'}
                                </p>
                                {details && (
                                    <div className="mt-4 p-3 bg-red-600/10 rounded-xl font-mono text-[10px] break-all border border-red-500/10">
                                        TRACING: {details}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                    </div>
                )}

                {success && (
                    <div className="group relative overflow-hidden p-6 rounded-[2rem] bg-green-500/10 dark:bg-green-500/5 border border-green-500/20 backdrop-blur-xl animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-4 text-green-600 dark:text-green-400 relative z-10">
                            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center shrink-0">
                                <CheckCircle2 size={24} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-tight">
                                    Operation Successful
                                </p>
                                <p className="text-xs font-bold opacity-80 leading-relaxed">
                                    Your account synchronization has been completed successfully.
                                </p>
                            </div>
                        </div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8">
                    {/* Workspace Info */}
                    <section className="bg-white/40 dark:bg-gray-950/40 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                        <header className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                    Workspace Configuration
                                </h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global identity settings</p>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Entity Name</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{currentWorkspace?.name || 'Default Workspace'}</p>
                            </div>
                            <div className="p-5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Administrative Access</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.email}</p>
                            </div>
                        </div>
                    </section>

                    {/* Connected Accounts */}
                    <section className="bg-white/40 dark:bg-gray-950/40 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm hover:shadow-xl transition-all duration-500">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-10">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/5 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                        Channel Matrix
                                    </h2>
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-16">Active social media integrations</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <DemoAccountButton workspaceId={currentWorkspace?.id || 'default'} />
                                <ConnectInstagramButton workspaceId={currentWorkspace?.id || 'default'} />
                                <ConnectFacebookButton workspaceId={currentWorkspace?.id || 'default'} />
                                <ConnectPinterestButton workspaceId={currentWorkspace?.id || 'default'} />
                            </div>
                        </div>

                        {socialAccounts && socialAccounts.length > 0 ? (
                            <ConnectedAccounts accounts={socialAccounts} />
                        ) : (
                            <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/20 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-3xl">
                                    📱
                                </div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                                    Matrix Blank
                                </h3>
                                <p className="text-[10px] font-black text-gray-400 px-10 uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                                    Initialize your first channel connection using the controls above to start deploying content.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Shopify Integration */}
                    <section className="bg-gray-900 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <AlertCircle size={150} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-10">
                                <div>
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-green-400 border border-white/20 shadow-xl">
                                            <div className="text-2xl">🛍️</div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black uppercase tracking-tighter">
                                                Commerce Link
                                            </h2>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shopify store synchronization</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-400 max-w-md leading-relaxed">
                                        Connect your Shopify instance to propagate product intelligence directly into your content scheduling matrix.
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <ConnectShopifyButton workspaceId={currentWorkspace?.id || 'default'} />
                                </div>
                            </div>

                            <div className="p-8 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-inner">
                                <ShopifyStatus />
                            </div>
                        </div>

                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />
                    </section>
                </div>
            </div>
        </DashboardLayout>
    )
}
