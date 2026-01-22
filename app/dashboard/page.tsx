import React from 'react'
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
            <div className="max-w-7xl mx-auto space-y-10">
                <header className="relative py-4">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
                    <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-sm sm:text-lg text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Welcome back, <span className="text-gray-900 dark:text-white font-bold">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                    </p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <StatCard
                        title="Usage Limit"
                        value={`${usagePercentage.toFixed(0)}%`}
                        subtitle={`${totalPosts || 0}/${planLimit}`}
                        icon={<FileText size={20} />}
                        progress={usagePercentage}
                        color="blue"
                    />
                    <StatCard
                        title="Published"
                        value={publishedPosts || 0}
                        icon={<Instagram size={20} />}
                        color="green"
                    />
                    <StatCard
                        title="Scheduled"
                        value={scheduledPosts || 0}
                        icon={<CalendarIcon size={20} />}
                        color="orange"
                    />
                    <StatCard
                        title="Active Channels"
                        value={connectedAccounts?.length || 0}
                        icon={<Instagram size={20} />}
                        color="purple"
                    />
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Actions */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="grid sm:grid-cols-2 gap-6">
                            <Link
                                href="/composer"
                                className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-800/50 p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <FileText size={80} />
                                </div>
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-blue-500/30 group-hover:rotate-6 transition-transform">
                                    <FileText size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                    Create Post
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                    Magic AI composer is ready for your next viral post.
                                </p>
                            </Link>

                            <Link
                                href="/settings"
                                className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-800/50 p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Settings size={80} />
                                </div>
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-purple-500/30 group-hover:-rotate-6 transition-transform">
                                    <Settings size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                    Settings
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                    Manage your connected accounts and preferences.
                                </p>
                            </Link>
                        </section>

                        {/* Recent Activity */}
                        <section className="bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden shadow-sm">
                            <div className="px-8 py-6 border-b border-gray-100/50 dark:border-gray-900/50 flex items-center justify-between">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                    Recent Activity
                                </h2>
                                <Link href="/calendar" className="text-sm px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 font-bold hover:bg-blue-600 hover:text-white transition-all">
                                    View All
                                </Link>
                            </div>
                            <div className="divide-y divide-gray-100/50 dark:divide-gray-900/50">
                                {recentPosts && recentPosts.length > 0 ? (
                                    recentPosts.map(post => (
                                        <Link
                                            key={post.id}
                                            href={`/composer?postId=${post.id}`}
                                            className="flex items-center px-8 py-5 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors gap-6 group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                                <span className="text-lg font-black text-gray-400 dark:text-gray-600 uppercase">
                                                    {post.caption?.slice(0, 1) || 'P'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                                    {post.caption}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                                        @{post.social_accounts?.account_name}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                        {new Date(post.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${post.status === 'published' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                post.status === 'scheduled' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                                    post.status === 'failed' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                        'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                                }`}>
                                                {post.status}
                                            </span>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="py-16 text-center">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="text-gray-300" size={24} />
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No posts found.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-8">
                        {/* Upcoming Queue */}
                        <section className="bg-gray-950 rounded-3xl p-8 border border-gray-800 shadow-2xl shadow-blue-900/10">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Upcoming</h3>
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <CalendarIcon size={16} className="text-blue-500" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                {upcomingPosts && upcomingPosts.length > 0 ? (
                                    upcomingPosts.map((post: any) => (
                                        <div key={post.id} className="flex items-start gap-4 group">
                                            <div className="mt-1 flex flex-col items-center gap-1">
                                                <div className="w-px h-10 bg-gradient-to-b from-gray-800 to-transparent group-last:hidden" />
                                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-gray-500 font-black uppercase mb-1">
                                                    {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-xs font-bold text-gray-200 truncate group-hover:text-blue-400 transition-colors">
                                                    {post.caption || 'No caption'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-[10px] font-bold text-gray-600 uppercase">Queue empty</p>
                                    </div>
                                )}
                            </div>

                            <Link href="/calendar" className="mt-8 block w-full py-3 text-center bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                Full Queue
                            </Link>
                        </section>

                        {/* Channel Status */}
                        <section className="bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8">Channels</h3>
                            <div className="space-y-6">
                                {connectedAccounts && connectedAccounts.length > 0 ? (
                                    connectedAccounts.map((account) => (
                                        <div key={account.id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${account.platform === 'instagram'
                                                    ? 'bg-gradient-to-br from-pink-500 to-orange-400 text-white'
                                                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                                    }`}>
                                                    <Instagram size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[120px]">
                                                        {account.account_name}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                        {account.platform}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded-lg">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-green-600 uppercase">Active</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">No channels</p>
                                        <Link href="/settings" className="mt-4 inline-block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase underline-offset-4 hover:underline transition-all">
                                            Connect Account
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

function StatCard({ title, value, subtitle, icon, progress, color }: { title: string; value: string | number; subtitle?: string; icon: React.ReactNode; progress?: number; color: 'blue' | 'green' | 'purple' | 'orange' }) {
    const colors = {
        blue: 'from-blue-500 to-blue-700 shadow-blue-500/20 text-blue-600',
        green: 'from-green-500 to-emerald-700 shadow-green-500/20 text-green-600',
        purple: 'from-purple-500 to-indigo-700 shadow-purple-500/20 text-purple-600',
        orange: 'from-orange-500 to-red-600 shadow-orange-500/20 text-orange-600'
    }

    return (
        <div className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-800/50 p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.08] transition-transform duration-700 group-hover:scale-150 rotate-12">
                {React.cloneElement(icon as React.ReactElement, { size: 64 })}
            </div>

            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
                    {icon}
                </div>
            </div>

            <div className="relative z-10">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</h3>
                    {subtitle && (
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                            / {subtitle}
                        </span>
                    )}
                </div>

                {progress !== undefined && (
                    <div className="mt-6 w-full bg-gray-100 dark:bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`bg-gradient-to-r ${colors[color]} h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
