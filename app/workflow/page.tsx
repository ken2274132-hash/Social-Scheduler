import DashboardLayout from '@/components/DashboardLayout'
import WorkflowBuilder from '@/components/WorkflowBuilder'
import { getWorkspace } from '@/lib/get-workspace'

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
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Workflows</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automate content across your accounts</p>
                </div>

                <WorkflowBuilder
                    workspaceId={workspace?.id || ''}
                    socialAccounts={socialAccounts || []}
                />
            </div>
        </DashboardLayout>
    )
}
