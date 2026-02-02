import { redirect } from 'next/navigation'
import CalendarView from '@/components/CalendarView'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getWorkspace } from '@/lib/get-workspace'

export default async function CalendarPage() {
    const { workspace, supabase } = await getWorkspace()

    if (!workspace) {
        redirect('/dashboard')
    }

    // Get posts for this workspace
    const { data: posts } = await supabase
        .from('posts')
        .select('*, social_accounts(*), media_assets(*)')
        .eq('workspace_id', workspace.id)
        .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('scheduled_at', { ascending: true })

    return (
        <DashboardLayout currentPage="calendar">
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Content Calendar</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and view your scheduled content</p>
                    </div>
                    <Link
                        href="/composer"
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm shadow-indigo-600/20"
                    >
                        <Plus size={16} /> New Post
                    </Link>
                </div>

                <CalendarView posts={posts || []} />
            </div>
        </DashboardLayout>
    )
}
