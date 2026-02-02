import ConnectInstagramButton from '@/components/ConnectInstagramButton'
import ConnectFacebookButton from '@/components/ConnectFacebookButton'
import ConnectPinterestButton from '@/components/ConnectPinterestButton'
import ConnectShopifyButton from '@/components/ConnectShopifyButton'
import DemoAccountButton from '@/components/DemoAccountButton'
import ConnectedAccounts from '@/components/ConnectedAccounts'
import ShopifyStatus from '@/components/ShopifyStatus'
import DashboardLayout from '@/components/DashboardLayout'
import { AlertCircle, CheckCircle2, Link2, ShoppingBag, User, Mail, Building2 } from 'lucide-react'
import { getWorkspace } from '@/lib/get-workspace'

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
        .select('*')
        .eq('workspace_id', currentWorkspace?.id || '')
        .eq('is_active', true)

    const connectedCount = socialAccounts?.length || 0

    return (
        <DashboardLayout currentPage="settings">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                            Settings
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage your workspace and connected accounts
                        </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400">
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
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Workspace
                                </h2>
                                <p className="text-xs text-gray-500">Your account details</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <User className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Workspace Name</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {currentWorkspace?.name || 'Default Workspace'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Accounts Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <Link2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Social Accounts
                                    </h2>
                                    <p className="text-xs text-gray-500">Connect your social media platforms</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <DemoAccountButton workspaceId={currentWorkspace?.id || 'default'} />
                                <ConnectInstagramButton workspaceId={currentWorkspace?.id || 'default'} />
                                <ConnectFacebookButton workspaceId={currentWorkspace?.id || 'default'} />
                                <ConnectPinterestButton workspaceId={currentWorkspace?.id || 'default'} />
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        {socialAccounts && socialAccounts.length > 0 ? (
                            <ConnectedAccounts accounts={socialAccounts} />
                        ) : (
                            <div className="text-center py-12 px-4">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">📱</span>
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                    No accounts connected
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                    Connect your first social media account using the buttons above to start scheduling posts.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Shopify Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Shopify
                                    </h2>
                                    <p className="text-xs text-gray-500">Create posts from your products</p>
                                </div>
                            </div>
                            <ConnectShopifyButton workspaceId={currentWorkspace?.id || 'default'} />
                        </div>
                    </div>
                    <div className="p-6">
                        <ShopifyStatus />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
