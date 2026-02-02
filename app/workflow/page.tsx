import DashboardLayout from '@/components/DashboardLayout'
import WorkflowBuilder from '@/components/WorkflowBuilder'
import { getWorkspace } from '@/lib/get-workspace'

export const dynamic = 'force-dynamic'

export default async function WorkflowPage() {
    const { workspace, supabase } = await getWorkspace()

    // Get connected social accounts
    const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspace?.id || '')
        .eq('is_active', true)

    return (
        <DashboardLayout currentPage="workflow">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Workflows</h1>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Automate content across your accounts</p>
                </div>

                <WorkflowBuilder
                    workspaceId={workspace?.id || ''}
                    socialAccounts={socialAccounts || []}
                />
            </div>
        </DashboardLayout>
    )
}
