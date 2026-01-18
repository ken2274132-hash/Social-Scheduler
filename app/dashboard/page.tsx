import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, FileText, Calendar as CalendarIcon, Settings, Instagram } from 'lucide-react'
import Link from 'next/link'
import ConnectInstagramButton from '@/components/ConnectInstagramButton'
import DashboardLayout from '@/components/DashboardLayout'

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
        <DashboardLayout currentPage="dashboard">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
                    Here's what's happening with your social media
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                    <StatCard
                        title="Total Posts"
                        value={totalPosts || 0}
                        icon={<FileText className="text-blue-600" size={20} />}
                    />
                    <StatCard
                        title="Published"
                        value={publishedPosts || 0}
                        icon={<Instagram className="text-green-600" size={20} />}
                    />
                    <StatCard
                        title="Scheduled"
                        value={scheduledPosts || 0}
                        icon={<CalendarIcon className="text-orange-600" size={20} />}
                    />
                    <StatCard
                        title="Connected"
                        value={connectedAccounts?.length || 0}
                        icon={<Instagram className="text-purple-600" size={20} />}
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <Link
                        href="/composer"
                        className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                    >
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                            Create New Post
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                            Upload media, generate AI content, and schedule your post
                        </p>
                    </Link>

                    <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                            Connect Instagram
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                            Link your Instagram account to start auto-posting
                        </p>
                        {workspace && <ConnectInstagramButton workspaceId={workspace.id} />}
                    </div>
                </div>

                {/* Recent Posts */}
                {recentPosts && recentPosts.length > 0 && (
                    <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                            Recent Activity
                        </h2>
                        <div className="space-y-2 sm:space-y-3">
                            {recentPosts.map(post => (
                                <div
                                    key={post.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg gap-2 sm:gap-0"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 dark:text-white truncate">
                                            {post.caption}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            {post.social_accounts?.account_name} • {new Date(post.scheduled_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full self-start sm:self-auto whitespace-nowrap ${post.status === 'published' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' :
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
        </DashboardLayout>
    )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                </div>
                <div className="shrink-0">{icon}</div>
            </div>
        </div>
    )
}
