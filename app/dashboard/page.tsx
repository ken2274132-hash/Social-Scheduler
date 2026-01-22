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
                <header className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
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
                                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 transition-colors hover:border-blue-500"
                            >
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    Create Post
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                    Magic AI composer is ready for your next viral post.
                                </p>
                            </Link>

                            <Link
                                href="/settings"
                                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 transition-colors hover:border-blue-500"
                            >
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 mb-6 transition-colors group-hover:text-blue-600">
                                    <Settings size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    Settings
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                    Manage your connected accounts and preferences.
                                </p>
                            </Link>
                        </section>

                        {/* Recent Activity */}
                        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                    Recent Activity
                                </h2>
                                <Link href="/calendar" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                                    View All
                                </Link>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {recentPosts && recentPosts.length > 0 ? (
                                    recentPosts.map(post => (
                                        <Link
                                            key={post.id}
                                            href={`/composer?postId=${post.id}`}
                                            className="flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-4 group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                <FileText size={18} className="text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {post.caption}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                        @{post.social_accounts?.account_name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        • {new Date(post.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${post.status === 'published' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                                post.status === 'scheduled' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                                                    post.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                                        'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
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
                        <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">Upcoming</h3>
                                <CalendarIcon size={16} className="text-gray-400" />
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
                        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-6">Channels</h3>
                            <div className="space-y-4">
                                {connectedAccounts && connectedAccounts.length > 0 ? (
                                    connectedAccounts.map((account) => (
                                        <div key={account.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                                                    <Instagram size={16} />
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
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
        purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
        orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center`}>
                    {React.cloneElement(icon as React.ReactElement, { size: 20 })}
                </div>
            </div>

            <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
                    {subtitle && (
                        <span className="text-[10px] font-bold text-gray-400">
                            / {subtitle}
                        </span>
                    )}
                </div>

                {progress !== undefined && (
                    <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                        <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
