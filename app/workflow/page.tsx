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
                <header className="flex flex-col gap-2 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-10 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.6)]" />
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                            Automated Workflows
                        </h1>
                    </div>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-6">
                        Bulk propagate content across your social matrix
                    </p>
                </header>

                <WorkflowBuilder
                    workspaceId={workspace?.id || ''}
                    socialAccounts={socialAccounts || []}
                />
            </div>
        </DashboardLayout>
    )
}
