import { redirect } from 'next/navigation'
import ComposerForm from '@/components/ComposerForm'
import DashboardLayout from '@/components/DashboardLayout'
import { getWorkspace } from '@/lib/get-workspace'
import { SOCIAL_ACCOUNT_PUBLIC_COLUMNS } from '@/lib/api'
import { isPublishingPlatform } from '@/lib/platforms'
import { PenSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ComposerPage({
    searchParams
}: {
    searchParams: Promise<{ edit?: string; postId?: string }>
}) {
    const resolvedParams = await searchParams
    // The dashboard and calendar link with `?edit=`; `?postId=` is the older
    // spelling and is still accepted so no existing link breaks.
    const postId = resolvedParams.edit || resolvedParams.postId
    const { workspace, supabase } = await getWorkspace()

    if (!workspace) {
        redirect('/dashboard')
    }

    // Run social accounts and optional post edit query in parallel
    const socialAccountsPromise = supabase
        .from('social_accounts')
        .select(SOCIAL_ACCOUNT_PUBLIC_COLUMNS)
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

    const [{ data: allAccounts }, { data: initialPost }] = await Promise.all([
        socialAccountsPromise,
        postPromise
    ])

    // Only destinations belong in the picker. A connected blog is a content
    // source — posts are pulled from it, never sent to it.
    const socialAccounts = (allAccounts || []).filter((a) => isPublishingPlatform(a.platform))

    return (
        <DashboardLayout currentPage="composer">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mb-6">
                    {initialPost ? 'Edit Post' : 'Create Post'}
                </h1>

                {socialAccounts && socialAccounts.length > 0 ? (
                    <ComposerForm
                        workspaceId={workspace.id}
                        socialAccounts={socialAccounts}
                        initialPost={initialPost}
                    />
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm shadow-slate-200/30 dark:shadow-none p-12 text-center">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-slate-100 dark:border-slate-800">
                            <PenSquare size={22} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                            Connect a social account
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                            Link your social media accounts in settings to start creating posts.
                        </p>
                        <a
                            href="/settings"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            Go to Settings
                        </a>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
