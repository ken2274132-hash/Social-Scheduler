import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FileText, Send, Users, Plus, AlertTriangle, RefreshCw, Eye, Pencil, Calendar, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardFilters from '@/components/DashboardFilters'

// Platform icons and colors
const platformConfig: Record<string, { color: string; bg: string; icon: string }> = {
    instagram: { color: 'text-pink-600', bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', icon: '📸' },
    facebook: { color: 'text-blue-600', bg: 'bg-blue-600', icon: '👤' },
    pinterest: { color: 'text-red-600', bg: 'bg-red-600', icon: '📌' },
    twitter: { color: 'text-sky-500', bg: 'bg-sky-500', icon: '🐦' },
}

export default async function DashboardPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
    const search = typeof searchParams.search === 'string' ? searchParams.search : ''
    const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'newest'
    const pageSize = 6
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

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

    if (!workspace) {
        const { data: newWorkspace } = await supabase
            .from('workspaces')
            .insert({ name: 'Default Workspace', owner_id: user.id })
            .select()
            .single()
        workspace = newWorkspace
    }

    // Get all stats in parallel
    const [
        { count: totalPostsCount },
        { count: publishedPosts },
        { count: failedPosts },
        { count: scheduledPosts },
        { data: connectedAccounts }
    ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace?.id || ''),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace?.id || '').eq('status', 'published'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace?.id || '').eq('status', 'failed'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace?.id || '').eq('status', 'scheduled'),
        supabase.from('social_accounts').select('*').eq('workspace_id', workspace?.id || '').eq('is_active', true)
    ])

    // Fetch recent posts with search and sort
    let postsQuery = supabase
        .from('posts')
        .select('*, social_accounts(*), media_assets(*)', { count: 'exact' })
        .eq('workspace_id', workspace?.id || '')

    if (search) {
        postsQuery = postsQuery.ilike('caption', `%${search}%`)
    }

    postsQuery = sort === 'oldest'
        ? postsQuery.order('created_at', { ascending: true })
        : postsQuery.order('created_at', { ascending: false })

    const { data: recentPosts, count: totalRecentPosts } = await postsQuery.range(from, to)
    const totalPages = Math.ceil((totalRecentPosts || 0) / pageSize)

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]

    return (
        <DashboardLayout currentPage="dashboard">
            <div className="space-y-6">
                {/* Header with Quick Action */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Welcome back, {firstName}! <span className="inline-block animate-bounce-slow">👋</span>
                        </h1>
                        <p className="text-sm text-muted mt-1">Here&apos;s what&apos;s happening with your content</p>
                    </div>
                    <Link
                        href="/composer"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-white rounded-2xl font-bold text-sm hover:bg-brand-dark transition-all shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 active:scale-95"
                    >
                        <Plus size={18} />
                        Create Post
                    </Link>
                </header>

                {/* Failed Posts Alert */}
                {(failedPosts || 0) > 0 && (
                    <div className="flex items-center justify-between p-4 bg-danger-light dark:bg-danger/10 border border-danger/20 rounded-2xl animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-danger/10 rounded-xl flex items-center justify-center">
                                <AlertTriangle size={20} className="text-danger" />
                            </div>
                            <div>
                                <p className="font-bold text-danger text-sm">{failedPosts} post{(failedPosts || 0) > 1 ? 's' : ''} failed to publish</p>
                                <p className="text-xs text-danger/70">Check your account connections and try again</p>
                            </div>
                        </div>
                        <Link href="/settings" className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-xl text-xs font-bold hover:bg-danger/90 transition-all">
                            <RefreshCw size={14} />
                            Fix Now
                        </Link>
                    </div>
                )}

                {/* Stats Grid - Redesigned */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCardNew
                        title="Total Posts"
                        value={totalPostsCount || 0}
                        icon={<FileText size={20} />}
                        gradient="from-blue-500 to-cyan-400"
                    />
                    <StatCardNew
                        title="Published"
                        value={publishedPosts || 0}
                        icon={<Send size={20} />}
                        gradient="from-green-500 to-emerald-400"
                    />
                    <StatCardNew
                        title="Scheduled"
                        value={scheduledPosts || 0}
                        icon={<Clock size={20} />}
                        gradient="from-orange-500 to-amber-400"
                    />
                    <StatCardNew
                        title="Accounts"
                        value={connectedAccounts?.length || 0}
                        icon={<Users size={20} />}
                        gradient="from-purple-500 to-pink-400"
                    />
                </div>

                {/* Content Table Section */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/50 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Posts</h2>
                            <DashboardFilters />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Content</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Platform</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-muted uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {recentPosts && recentPosts.length > 0 ? (
                                    recentPosts.map((post: any) => {
                                        const platform = post.social_accounts?.platform?.toLowerCase() || 'instagram'
                                        const config = platformConfig[platform] || platformConfig.instagram
                                        return (
                                            <tr key={post.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {post.media_assets?.url ? (
                                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                                                                <Image
                                                                    src={post.media_assets.url}
                                                                    alt=""
                                                                    width={48}
                                                                    height={48}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                                <FileText size={20} className="text-gray-400" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                                                {post.caption?.slice(0, 50) || 'No caption'}
                                                                {post.caption?.length > 50 && '...'}
                                                            </p>
                                                            <p className="text-xs text-muted">@{post.social_accounts?.account_name || 'unknown'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center text-white text-sm`}>
                                                            {config.icon}
                                                        </span>
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{platform}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                                                        {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-muted">
                                                        {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={post.status} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="View">
                                                            <Eye size={16} className="text-gray-500" />
                                                        </button>
                                                        <Link href={`/composer?edit=${post.id}`} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Edit">
                                                            <Pencil size={16} className="text-gray-500" />
                                                        </Link>
                                                        {post.status === 'failed' && (
                                                            <button className="p-2 hover:bg-danger-light rounded-lg transition-colors" title="Retry">
                                                                <RefreshCw size={16} className="text-danger" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                                                    <Calendar size={28} className="text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">No posts yet</p>
                                                    <p className="text-sm text-muted mt-1">Create your first post to get started</p>
                                                </div>
                                                <Link href="/composer" className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand-dark transition-all">
                                                    Create Post
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 0 && (
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <p className="text-sm text-muted">
                                Showing <span className="font-medium text-gray-900 dark:text-white">{from + 1}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(to + 1, totalRecentPosts || 0)}</span> of <span className="font-medium text-gray-900 dark:text-white">{totalRecentPosts}</span> posts
                            </p>
                            <div className="flex items-center gap-1">
                                <PaginationButton href={`/dashboard?page=${Math.max(1, page - 1)}${search ? `&search=${search}` : ''}${sort !== 'newest' ? `&sort=${sort}` : ''}`} disabled={page <= 1}>
                                    ←
                                </PaginationButton>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                                    <PaginationButton
                                        key={p}
                                        href={`/dashboard?page=${p}${search ? `&search=${search}` : ''}${sort !== 'newest' ? `&sort=${sort}` : ''}`}
                                        active={p === page}
                                    >
                                        {p}
                                    </PaginationButton>
                                ))}
                                {totalPages > 5 && <span className="px-2 text-muted">...</span>}
                                <PaginationButton href={`/dashboard?page=${Math.min(totalPages, page + 1)}${search ? `&search=${search}` : ''}${sort !== 'newest' ? `&sort=${sort}` : ''}`} disabled={page >= totalPages}>
                                    →
                                </PaginationButton>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </DashboardLayout>
    )
}

function StatCardNew({ title, value, icon, gradient }: { title: string; value: number; icon: React.ReactNode; gradient: string }) {
    return (
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800/50 group hover:shadow-lg transition-all">
            <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all`} />
            <div className="relative">
                <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white mb-3 shadow-lg`}>
                    {icon}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
                <p className="text-xs font-medium text-muted mt-1">{title}</p>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; dot: string }> = {
        published: { bg: 'bg-success-light dark:bg-success/10', text: 'text-success-dark', dot: 'bg-success' },
        failed: { bg: 'bg-danger-light dark:bg-danger/10', text: 'text-danger', dot: 'bg-danger' },
        scheduled: { bg: 'bg-warning-light dark:bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
        draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
    }
    const c = config[status] || config.draft
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}

function PaginationButton({ href, children, disabled, active }: { href: string; children: React.ReactNode; disabled?: boolean; active?: boolean }) {
    if (disabled) {
        return (
            <span className="w-9 h-9 flex items-center justify-center rounded-lg text-sm text-gray-300 dark:text-gray-600 cursor-not-allowed">
                {children}
            </span>
        )
    }
    return (
        <Link
            href={href}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${active
                ? 'bg-brand text-white shadow-lg shadow-brand/25'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
        >
            {children}
        </Link>
    )
}
