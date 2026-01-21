import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import WorkflowBuilder from '@/components/WorkflowBuilder'

export default async function WorkflowPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user's workspace
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single()

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
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Workflow Builder
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Schedule multiple products across different days automatically
                    </p>
                </div>

                <WorkflowBuilder
                    workspaceId={workspace?.id || ''}
                    socialAccounts={socialAccounts || []}
                />
            </div>
        </DashboardLayout>
    )
}
