import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConnectInstagramButton from '@/components/ConnectInstagramButton'
import ConnectedAccounts from '@/components/ConnectedAccounts'

export default async function SettingsPage() {
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                    Settings
                </h1>

                {/* Workspace Info */}
                <section className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Workspace
                    </h2>
                    <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Name:</span> {currentWorkspace?.name || 'Default Workspace'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Owner:</span> {user.email}
                        </p>
                    </div>
                </section>

                {/* Connected Accounts */}
                <section className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Connected Accounts
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Connect your Instagram account to start posting
                            </p>
                        </div>
                        {currentWorkspace && (
                            <ConnectInstagramButton workspaceId={currentWorkspace.id} />
                        )}
                    </div>

                    {socialAccounts && socialAccounts.length > 0 ? (
                        <ConnectedAccounts accounts={socialAccounts} />
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                            <div className="text-4xl mb-4">📱</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No accounts connected yet
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click "Connect Instagram" above to get started
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
