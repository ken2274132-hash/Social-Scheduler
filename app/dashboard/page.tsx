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

    // Get user's profile for post_limit
    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

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

    // Get stats and recent posts in parallel
    // Get stats and recent posts in parallel
    // Get stats and recent posts in parallel
    const [
        { count: totalPosts },
        { count: publishedPosts },
        { count: scheduledPosts },
        { count: failedPosts },
        { data: connectedAccounts },
        { data: recentPosts },
        { data: draftPosts },
        { data: upcomingPosts }
    ] = await Promise.all([
        supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace?.id || ''),
        supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace?.id || '')
            .eq('status', 'published'),
        supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace?.id || '')
            .eq('status', 'scheduled'),
        supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace?.id || '')
            .eq('status', 'failed'),
        supabase
            .from('social_accounts')
            .select('*')
            .eq('workspace_id', workspace?.id || '')
            .eq('is_active', true),
        supabase
            .from('posts')
            .select('*, social_accounts(*)')
            .eq('workspace_id', workspace?.id || '')
            .order('created_at', { ascending: false })
            .limit(5),
        supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace?.id || '')
            .eq('status', 'draft'),
        // Fetch 3 upcoming posts
        supabase
            .from('posts')
            .select('*, social_accounts(*)')
            .eq('workspace_id', workspace?.id || '')
            .eq('status', 'scheduled')
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(3)
    ])

    const planLimit = profile?.post_limit || 10;
    const usagePercentage = Math.min(((totalPosts || 0) / planLimit) * 100, 100);

    return (
        <DashboardLayout currentPage="dashboard">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
                    Here's what's happening with your social media
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
                    <StatCard
                        title="Limit"
                        value={`${usagePercentage.toFixed(0)}%`}
                        subtitle={`${totalPosts || 0}/${planLimit}`}
                        icon={<FileText className="text-blue-600" size={18} />}
                        progress={usagePercentage}
                    />
                    <StatCard
                        title="Published"
                        value={publishedPosts || 0}
                        icon={<Instagram className="text-green-600" size={18} />}
                    />
                    <StatCard
                        title="Scheduled"
                        value={scheduledPosts || 0}
                        icon={<CalendarIcon className="text-orange-600" size={18} />}
                    />
                    <StatCard
                        title="Accounts"
                        value={connectedAccounts?.length || 0}
                        icon={<Instagram className="text-purple-600" size={18} />}
                    />
                </div>

                <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
                    {/* Main Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                            <Link
                                href="/composer"
                                className="group bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/10"
                            >
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    Create New Post
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                    Generate AI captions, upload media, and schedule to automated platforms.
                                </p>
                            </Link>

                            <Link
                                href="/settings"
                                className="group bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 hover:border-purple-500 dark:hover:border-purple-500 transition-all shadow-sm hover:shadow-xl hover:shadow-purple-500/10"
                            >
                                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                                    <Instagram size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    Manage Channels
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                    Link or unlink your Instagram and Facebook professional accounts.
                                </p>
                            </Link>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Recent Activity
                                </h2>
                                <Link href="/calendar" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                    View Calendar
                                </Link>
                            </div>
                            <div className="p-2">
                                {recentPosts && recentPosts.length > 0 ? (
                                    recentPosts.map(post => (
                                        <Link
                                            key={post.id}
                                            href={`/composer?postId=${post.id}`}
                                            className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl transition-colors gap-4 group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                                {post.caption?.slice(0, 1) || 'P'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                                    {post.caption}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                        {post.social_accounts?.account_name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">•</span>
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                        {new Date(post.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border ${post.status === 'published' ? 'bg-green-100/50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800' :
                                                post.status === 'scheduled' ? 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800' :
                                                    post.status === 'failed' ? 'bg-red-100/50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800' :
                                                        'bg-gray-100/50 dark:bg-gray-800 text-gray-600 border-gray-200 dark:border-gray-700'
                                                }`}>
                                                {post.status}
                                            </span>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        {/* Upcoming Queue */}
                        <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white">Upcoming Queue</h3>
                                <CalendarIcon size={16} className="text-orange-500" />
                            </div>

                            <div className="space-y-4">
                                {upcomingPosts && upcomingPosts.length > 0 ? (
                                    upcomingPosts.map((post: any) => (
                                        <div key={post.id} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                                            <div className="mt-1">
                                                {post.social_accounts?.platform === 'instagram' ? (
                                                    <Instagram size={14} className="text-pink-500" />
                                                ) : (
                                                    <Instagram size={14} className="text-blue-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-200 truncate">
                                                    {post.caption || 'No caption'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tight">
                                                    {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-xs text-gray-500 italic">No posts scheduled next</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Account Health/Status */}
                        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Channel Status</h3>
                            <div className="space-y-4">
                                {connectedAccounts && connectedAccounts.length > 0 ? (
                                    connectedAccounts.map((account) => (
                                        <div key={account.id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${account.platform === 'instagram'
                                                    ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600'
                                                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                                    }`}>
                                                    <Instagram size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                                                        {account.account_name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 capitalize">
                                                        {account.platform}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                <span className="text-[10px] font-bold text-green-600 uppercase">Active</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-xs text-gray-500">No accounts connected</p>
                                        <Link href="/settings" className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline mt-2 inline-block">
                                            Connect Now
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

function StatCard({ title, value, subtitle, icon, progress }: { title: string; value: string | number; subtitle?: string; icon: React.ReactNode; progress?: number }) {
    return (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="relative z-10 flex items-center justify-between mb-1 sm:mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
                    {icon}
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-[11px] sm:text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
                    {subtitle && <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-tight truncate max-w-[50px] sm:max-w-none">{subtitle}</span>}
                </div>
                {progress !== undefined && (
                    <div className="mt-3 sm:mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 sm:h-1.5 overflow-hidden">
                        <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Subtle background decoration */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                {icon}
            </div>
        </div>
    )
}
