import ConnectInstagramButton from '@/components/ConnectInstagramButton'
import ConnectFacebookButton from '@/components/ConnectFacebookButton'
import ConnectPinterestButton from '@/components/ConnectPinterestButton'
import ConnectWordPressButton from '@/components/ConnectWordPressButton'
import ConnectShopifyButton from '@/components/ConnectShopifyButton'
import ConnectedAccounts from '@/components/ConnectedAccounts'
import ShopifyStatus from '@/components/ShopifyStatus'
import DashboardLayout from '@/components/DashboardLayout'
import { AlertCircle, CheckCircle2, Link2, ShoppingBag, User, Mail, Building2, Download, Globe } from 'lucide-react'
import { getWorkspace } from '@/lib/get-workspace'
import { SOCIAL_ACCOUNT_PUBLIC_COLUMNS } from '@/lib/api'
import { splitByRole } from '@/lib/platforms'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const error = params.error as string
    const details = params.details as string
    const success = params.success as string

    const { user, workspace: currentWorkspace, supabase } = await getWorkspace()

    // Get connected social accounts
    const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select(SOCIAL_ACCOUNT_PUBLIC_COLUMNS)
        .eq('workspace_id', currentWorkspace?.id || '')
        .eq('is_active', true)

    // Two different things live in this table: places we publish TO, and places
    // we pull content FROM. They get their own sections so the page cannot
    // imply that a blog is somewhere posts are sent.
    const { destinations, sources } = splitByRole(socialAccounts || [])

    const connectedCount = socialAccounts?.length || 0

    return (
        <DashboardLayout currentPage="settings">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                            Settings
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage your workspace and connected accounts
                        </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        {connectedCount} connected
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                Connection Error
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                {error === 'no_pages' && 'No Facebook Pages found. You need a Facebook Page to connect Instagram.'}
                                {error === 'no_instagram' && 'No Instagram Professional account linked to this Facebook Page.'}
                                {error === 'oauth_denied' && 'Connection cancelled or denied.'}
                                {error === 'pinterest_denied' && 'Pinterest connection was cancelled or denied.'}
                                {error === 'token_exchange_failed' && 'Failed to exchange Pinterest code for access token.'}
                                {error === 'workspace_not_found' && 'No active workspace found for your account.'}
                                {error === 'save_failed' && 'Failed to save account to database.'}
                                {error === 'shopify_save_failed' && 'Failed to save Shopify store to database.'}
                                {error === 'connection_failed' && 'Failed to connect. Please try again.'}
                                {error === 'config_error' && 'Environment configuration error. Check your API keys.'}
                                {error === 'invalid_state' && 'Invalid session state. Please try again.'}
                                {error === 'invalid_session' && 'Session mismatch. Please try logging in again.'}
                                {error === 'callback_error' && 'A technical error occurred during the callback.'}
                                {!['no_pages', 'no_instagram', 'oauth_denied', 'pinterest_denied', 'token_exchange_failed', 'workspace_not_found', 'save_failed', 'shopify_save_failed', 'connection_failed', 'config_error', 'invalid_state', 'invalid_session', 'callback_error'].includes(error) && (details || `An unexpected error occurred: ${error}`)}
                            </p>
                            {details && (
                                <code className="block mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-600 dark:text-red-300 break-all">
                                    {details}
                                </code>
                            )}
                        </div>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            Account connected successfully!
                        </p>
                    </div>
                )}

                {/* Workspace Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm shadow-slate-200/30 dark:shadow-none overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Workspace
                                </h2>
                                <p className="text-xs text-slate-500">Your account details</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <User className="w-5 h-5 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Workspace Name</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {currentWorkspace?.name || 'Default Workspace'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <Mail className="w-5 h-5 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white break-all">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Accounts Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm shadow-slate-200/30 dark:shadow-none overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <Link2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        Social Accounts
                                    </h2>
                                    <p className="text-xs text-slate-500">Where your posts are published</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                                <ConnectInstagramButton workspaceId={currentWorkspace?.id || 'default'} />
                                <ConnectFacebookButton workspaceId={currentWorkspace?.id || 'default'} />
                                <ConnectPinterestButton workspaceId={currentWorkspace?.id || 'default'} />
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        {destinations.length > 0 ? (
                            <ConnectedAccounts accounts={destinations} />
                        ) : (
                            <div className="text-center py-12 px-4">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                                    <Link2 size={24} className="text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                                    No accounts connected
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Connect your first social media account using the buttons above to start scheduling posts.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Sources — where posts are pulled FROM, never sent to */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm shadow-slate-200/30 dark:shadow-none overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                                <Download className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Content Sources
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Bring content in from your blog or store. Nothing is ever posted back to these.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* WordPress blog */}
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#21759B]/10 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-[#21759B]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                        WordPress Blog
                                    </h3>
                                    <p className="text-xs text-slate-500">Turn your blog posts into social posts</p>
                                </div>
                            </div>
                            <ConnectWordPressButton workspaceId={currentWorkspace?.id || 'default'} />
                        </div>
                        {sources.length > 0 ? (
                            <ConnectedAccounts accounts={sources} />
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                <Globe className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    No blog connected. Connect one above to import posts.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Shopify store */}
                    <div className="px-6 py-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                        Shopify
                                    </h3>
                                    <p className="text-xs text-slate-500">Create posts from your products</p>
                                </div>
                            </div>
                            <ConnectShopifyButton workspaceId={currentWorkspace?.id || 'default'} />
                        </div>
                        <ShopifyStatus />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
