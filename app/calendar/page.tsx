import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/CalendarView'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

export default async function CalendarPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user's workspace
    let { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

    let workspace = workspaces?.[0]

    // Create workspace if none exists
    if (!workspace) {
        const { data: newWorkspace } = await supabase
            .from('workspaces')
            .insert({
                name: 'Default Workspace',
                owner_id: user.id
            })
            .select()
            .single()
        workspace = newWorkspace
    }

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
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-10 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.6)]" />
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                Calendar
                            </h1>
                        </div>
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-6">
                            Visualize and manage your content timeline
                        </p>
                    </div>
                    <Link
                        href="/composer"
                        className="group relative overflow-hidden px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-xl"
                    >
                        <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative">Create Post</span>
                    </Link>
                </header>

                <CalendarView posts={posts || []} />
            </div>
        </DashboardLayout>
    )
}
