import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ComposerForm from '@/components/ComposerForm'

export default async function ComposerPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user's workspace
    const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .or(`owner_id.eq.${user.id},id.in.(select workspace_id from workspace_members where user_id = '${user.id}')`)
        .order('created_at', { ascending: false })
        .limit(1)

    const workspace = workspaces?.[0]

    if (!workspace) {
        redirect('/dashboard')
    }

    // Get connected social accounts
    const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                    Create Post
                </h1>

                {socialAccounts && socialAccounts.length > 0 ? (
                    <ComposerForm
                        workspaceId={workspace.id}
                        socialAccounts={socialAccounts}
                    />
                ) : (
                    <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
                        <div className="text-4xl mb-4">🔌</div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No Social Accounts Connected
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            You need to connect an Instagram account before creating posts
                        </p>
                        <a
                            href="/settings"
                            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Go to Settings
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
