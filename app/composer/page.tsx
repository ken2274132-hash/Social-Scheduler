import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ComposerForm from '@/components/ComposerForm'
import DashboardLayout from '@/components/DashboardLayout'

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
        <DashboardLayout currentPage="composer">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">
                    Create Post
                </h1>

                {socialAccounts && socialAccounts.length > 0 ? (
                    <ComposerForm
                        workspaceId={workspace.id}
                        socialAccounts={socialAccounts}
                    />
                ) : (
                    <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl text-blue-600">📱</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            Connect Your Instagram
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                            To start creating and scheduling posts, you'll need to link your Instagram Professional account first.
                        </p>
                        <a
                            href="/settings"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-lg shadow-blue-500/25 transform hover:-translate-y-0.5"
                        >
                            Get Started in Settings
                        </a>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
