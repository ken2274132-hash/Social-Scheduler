import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, FileText, Calendar as CalendarIcon, Settings, Instagram } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
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

    // Get stats
    const { count: totalPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace?.id || '')

    const { count: publishedPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace?.id || '')
        .eq('status', 'published')

    const { count: scheduledPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace?.id || '')
        .eq('status', 'scheduled')

    const { data: connectedAccounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspace?.id || '')
        .eq('is_active', true)

    // Get recent posts
    const { data: recentPosts } = await supabase
        .from('posts')
        .select('*, social_accounts(*)')
        .eq('workspace_id', workspace?.id || '')
        .order('created_at', { ascending: false })
        .limit(5)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Side Navigation */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 p-6">
                <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white mb-8">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
                        SM
                    </div>
                    Social Scheduler
                </Link>

                <nav className="space-y-2">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    >
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link
                        href="/composer"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <FileText size={20} />
                        Create Post
                    </Link>
                    <Link
                        href="/calendar"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <CalendarIcon size={20} />
                        Calendar
                    </Link>
                    <Link
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Settings size={20} />
                        Settings
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Here's what's happening with your social media
                    </p>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Total Posts"
                            value={totalPosts || 0}
                            icon={<FileText className="text-blue-600" />}
                        />
                        <StatCard
                            title="Published"
                            value={publishedPosts || 0}
                            icon={<Instagram className="text-green-600" />}
                        />
                        <StatCard
                            title="Scheduled"
                            value={scheduledPosts || 0}
                            icon={<CalendarIcon className="text-orange-600" />}
                        />
                        <StatCard
                            title="Connected"
                            value={connectedAccounts?.length || 0}
                            icon={<Instagram className="text-purple-600" />}
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <Link
                            href="/composer"
                            className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Create New Post
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                Upload media, generate AI content, and schedule your post
                            </p>
                        </Link>

                        <Link
                            href="/settings"
                            className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Connect Instagram
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                Link your Instagram account to start auto-posting
                            </p>
                        </Link>
                    </div>

                    {/* Recent Posts */}
                    {recentPosts && recentPosts.length > 0 && (
                        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Recent Activity
                            </h2>
                            <div className="space-y-3">
                                {recentPosts.map(post => (
                                    <div
                                        key={post.id}
                                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-900 dark:text-white truncate">
                                                {post.caption}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {post.social_accounts?.account_name} • {new Date(post.scheduled_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${post.status === 'published' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' :
                                                post.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' :
                                                    post.status === 'failed' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' :
                                                        'bg-gray-100 dark:bg-gray-800 text-gray-600'
                                            }`}>
                                            {post.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                </div>
                {icon}
            </div>
        </div>
    )
}
