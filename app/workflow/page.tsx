import DashboardLayout from '@/components/DashboardLayout'
import WorkflowBuilder from '@/components/WorkflowBuilder'
import { getWorkspace } from '@/lib/get-workspace'
import { SOCIAL_ACCOUNT_PUBLIC_COLUMNS } from '@/lib/api'
import { isPublishingPlatform } from '@/lib/platforms'

export const dynamic = 'force-dynamic'

export default async function WorkflowPage() {
    const { workspace, supabase } = await getWorkspace()

    // Get connected social accounts
    const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select(SOCIAL_ACCOUNT_PUBLIC_COLUMNS)
        .eq('workspace_id', workspace?.id || '')
        .eq('is_active', true)

    return (
        <DashboardLayout currentPage="workflow">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Workflows</h1>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Automate content across your accounts</p>
                </div>

                {/* Destinations only — the connected blog is a content source,
                    offered in the Blog tab of the content library, not here. */}
                <WorkflowBuilder
                    workspaceId={workspace?.id || ''}
                    socialAccounts={(socialAccounts || []).filter((a) => isPublishingPlatform(a.platform))}
                />
            </div>
        </DashboardLayout>
    )
}
