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

    // Get stats and recent posts in parallel
    const [
        { count: totalPosts },
        { count: publishedPosts },
        { count: scheduledPosts },
        { data: connectedAccounts },
        { data: recentPosts },
        { data: draftPosts }
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
            .eq('status', 'draft')
    ])

    const planLimit = 10; // Placeholder for free plan limit
    const usagePercentage = Math.min(((totalPosts || 0) / planLimit) * 100, 100);

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
                    <StatCard
                        title="Storage"
                        value={`${usagePercentage.toFixed(0)}%`}
                        subtitle={`${totalPosts || 0} of ${planLimit} posts used`}
                        icon={<FileText className="text-blue-600" size={20} />}
                        progress={usagePercentage}
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
                        title="Accounts"
                        value={connectedAccounts?.length || 0}
                        icon={<Instagram className="text-purple-600" size={20} />}
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
                                        <div
                                            key={post.id}
                                            className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl transition-colors gap-4"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                                {post.caption?.slice(0, 1) || 'P'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {post.caption}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {post.social_accounts?.account_name} • {new Date(post.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${post.status === 'published' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' :
                                                post.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' :
                                                    post.status === 'failed' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' :
                                                        'bg-gray-100 dark:bg-gray-800 text-gray-600'
                                                }`}>
                                                {post.status}
                                            </span>
                                        </div>
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
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                            <h3 className="text-base font-bold mb-1">Growth Overview</h3>
                            <p className="text-blue-100 text-xs mb-6">Your posting frequency is up 12%</p>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="opacity-80">Efficiency</span>
                                    <span className="font-bold">88%</span>
                                </div>
                                <div className="w-full bg-white/20 rounded-full h-1.5">
                                    <div className="bg-white rounded-full h-1.5 w-[88%] shadow-[0_0_8px_rgba(255,255,255,0.5)]"></div>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="opacity-80">AI Utilization</span>
                                    <span className="font-bold">95%</span>
                                </div>
                                <div className="w-full bg-white/20 rounded-full h-1.5">
                                    <div className="bg-white rounded-full h-1.5 w-[95%] shadow-[0_0_8px_rgba(255,255,255,0.5)]"></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Platform Reach</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-600">
                                        <Instagram size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium dark:text-gray-300">Instagram</span>
                                            <span className="text-gray-500">80%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                                            <div className="bg-pink-500 rounded-full h-1 w-[80%]"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                        <Instagram size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium dark:text-gray-300">Facebook</span>
                                            <span className="text-gray-500">20%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                                            <div className="bg-blue-500 rounded-full h-1 w-[20%]"></div>
                                        </div>
                                    </div>
                                </div>
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
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
                    {icon}
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
                    {subtitle && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-tight">{subtitle}</span>}
                </div>
                {progress !== undefined && (
                    <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
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
