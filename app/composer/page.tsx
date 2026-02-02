import { redirect } from 'next/navigation'
import ComposerForm from '@/components/ComposerForm'
import DashboardLayout from '@/components/DashboardLayout'
import { getWorkspace } from '@/lib/get-workspace'

export const dynamic = 'force-dynamic'

export default async function ComposerPage({
    searchParams
}: {
    searchParams: Promise<{ postId?: string }>
}) {
    const resolvedParams = await searchParams
    const postId = resolvedParams.postId
    const { workspace, supabase } = await getWorkspace()

    if (!workspace) {
        redirect('/dashboard')
    }

    // Run social accounts and optional post edit query in parallel
    const socialAccountsPromise = supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)

    const postPromise = postId
        ? supabase
            .from('posts')
            .select('*, media_assets(*)')
            .eq('id', postId)
            .eq('workspace_id', workspace.id)
            .single()
        : Promise.resolve({ data: null })

    const [{ data: socialAccounts }, { data: initialPost }] = await Promise.all([
        socialAccountsPromise,
        postPromise
    ])

    return (
        <DashboardLayout currentPage="composer">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                    {initialPost ? 'Edit Post' : 'Create Post'}
                </h1>

                {socialAccounts && socialAccounts.length > 0 ? (
                    <ComposerForm
                        workspaceId={workspace.id}
                        socialAccounts={socialAccounts}
                        initialPost={initialPost}
                    />
                ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
                        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <span className="text-2xl">📱</span>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Connect a social account
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                            Link your social media accounts in settings to start creating posts.
                        </p>
                        <a
                            href="/settings"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            Go to Settings
                        </a>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
