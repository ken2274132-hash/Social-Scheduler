import React from 'react'
import { Plus, AlertTriangle, ArrowUpRight, FileText, Calendar, Send, Clock, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardFilters from '@/components/DashboardFilters'
import { getWorkspace } from '@/lib/get-workspace'

const platformStyles: Record<string, string> = {
    instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
    facebook: 'bg-blue-600',
    pinterest: 'bg-red-500',
    twitter: 'bg-sky-500',
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
    const search = typeof searchParams.search === 'string' ? searchParams.search : ''
    const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'newest'
    const pageSize = 8
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { user, workspace, supabase } = await getWorkspace()
    const wid = workspace?.id || ''

    // Build posts query
    let postsQuery = supabase
        .from('posts')
        .select('*, social_accounts(*), media_assets(*)', { count: 'exact' })
        .eq('workspace_id', wid)

    if (search) {
        postsQuery = postsQuery.ilike('caption', `%${search}%`)
    }

    postsQuery = sort === 'oldest'
        ? postsQuery.order('created_at', { ascending: true })
        : postsQuery.order('created_at', { ascending: false })

    // Run ALL queries in parallel - stats + posts + accounts in one round trip
    const [
        { count: totalPostsCount },
        { count: publishedPosts },
        { count: failedPosts },
        { count: scheduledPosts },
        { data: connectedAccounts },
        { data: recentPosts, count: totalRecentPosts }
    ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', wid),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', wid).eq('status', 'published'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', wid).eq('status', 'failed'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', wid).eq('status', 'scheduled'),
        supabase.from('social_accounts').select('id', { count: 'exact', head: false }).eq('workspace_id', wid).eq('is_active', true),
        postsQuery.range(from, to)
    ])

    const totalPages = Math.ceil((totalRecentPosts || 0) / pageSize)
    const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]

    return (
        <DashboardLayout currentPage="dashboard">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                            Welcome, {firstName}
                        </h1>
                        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <Link
                        href="/composer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                    >
                        <Plus size={16} />
                        Create Post
                    </Link>
                </div>

                {/* Failed Alert */}
                {(failedPosts || 0) > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 rounded-xl">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={16} className="text-red-500" />
                            <span className="text-sm text-red-700 dark:text-red-400">
                                {failedPosts} post{(failedPosts || 0) > 1 ? 's' : ''} failed to publish
                            </span>
                        </div>
                        <Link href="/settings" className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline underline-offset-4">
                            Details
                        </Link>
                    </div>
                )}


                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard
                        label="Total Posts"
                        value={totalPostsCount || 0}
                        icon={<FileText size={18} />}
                    />
                    <StatCard
                        label="Published"
                        value={publishedPosts || 0}
                        icon={<Send size={18} />}
                        color="text-emerald-500"
                    />
                    <StatCard
                        label="Scheduled"
                        value={scheduledPosts || 0}
                        icon={<Clock size={18} />}
                        color="text-amber-500"
                    />
                    <StatCard
                        label="Accounts"
                        value={connectedAccounts?.length || 0}
                        icon={<Zap size={18} />}
                        color="text-indigo-500"
                    />
                </div>

                {/* Posts Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-sm shadow-slate-200/30 dark:shadow-none">
                    <div className="px-6 py-5 flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
                        <DashboardFilters />
                    </div>

                    {recentPosts && recentPosts.length > 0 ? (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {recentPosts.map((post: any) => {
                                const platform = post.social_accounts?.platform?.toLowerCase() || 'instagram'
                                const platformBg = platformStyles[platform] || platformStyles.instagram
                                return (
                                    <Link
                                        key={post.id}
                                        href={`/composer?edit=${post.id}`}
                                        className="group flex items-center gap-4 px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        {/* Thumbnail */}
                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-800">
                                            {post.media_assets?.url ? (
                                                <Image
                                                    src={post.media_assets.url}
                                                    alt=""
                                                    width={48}
                                                    height={48}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FileText size={16} className="text-slate-300 dark:text-slate-600" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base text-slate-900 dark:text-white truncate font-medium">
                                                {post.caption?.slice(0, 60) || 'No caption'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 px-0.5">
                                                <span className={`w-3 h-3 rounded-full ${platformBg} shrink-0`} />
                                                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{platform}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {post.scheduled_at
                                                        ? new Date(post.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                                                        : 'Unscheduled'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="hidden sm:block">
                                            <StatusPill status={post.status} />
                                        </div>

                                        {/* Arrow */}
                                        <ArrowUpRight size={14} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 px-4">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                                <Calendar size={24} className="text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Start your journey</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-8 max-w-[240px] mx-auto">Compose and schedule your first post to see it appear here.</p>
                            <Link
                                href="/composer"
                                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all"
                            >
                                <Plus size={14} />
                                Create Post
                            </Link>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/30 dark:bg-transparent">
                            <p className="text-[11px] font-medium text-slate-500">
                                Showing {from + 1}&ndash;{Math.min(to + 1, totalRecentPosts || 0)} of {totalRecentPosts}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <PageBtn
                                    href={`/dashboard?page=${Math.max(1, page - 1)}${search ? `&search=${search}` : ''}${sort !== 'newest' ? `&sort=${sort}` : ''}`}
                                    disabled={page <= 1}
                                >
                                    <ChevronLeft size={16} />
                                </PageBtn>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                                    <PageBtn
                                        key={p}
                                        href={`/dashboard?page=${p}${search ? `&search=${search}` : ''}${sort !== 'newest' ? `&sort=${sort}` : ''}`}
                                        active={p === page}
                                    >
                                        {p}
                                    </PageBtn>
                                ))}
                                <PageBtn
                                    href={`/dashboard?page=${Math.min(totalPages, page + 1)}${search ? `&search=${search}` : ''}${sort !== 'newest' ? `&sort=${sort}` : ''}`}
                                    disabled={page >= totalPages}
                                >
                                    <ChevronRight size={16} />
                                </PageBtn>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout >
    )
}

function StatCard({ label, value, icon, color }: { label: string, value: number | string, icon: React.ReactNode, color?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm shadow-slate-200/30 dark:shadow-none transition-all">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
                <div className={`w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${color || 'text-slate-400'}`}>
                    {icon}
                </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
        </div>
    )
}

function StatusPill({ status }: { status: string }) {
    const styles: Record<string, string> = {
        published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 ring-emerald-100/50 dark:ring-emerald-800/20',
        failed: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 ring-red-100/50 dark:ring-red-800/20',
        scheduled: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 ring-indigo-100/50 dark:ring-indigo-800/20',
        draft: 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 ring-slate-100 dark:ring-slate-700',
    }
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ring-1 shadow-sm ${styles[status] || styles.draft}`}>
            <span className={`w-1 h-1 rounded-full ${status === 'published' ? 'bg-emerald-500' :
                status === 'failed' ? 'bg-red-500' :
                    status === 'scheduled' ? 'bg-indigo-500' : 'bg-slate-400'
                }`} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}

function PageBtn({ href, children, disabled, active }: { href: string; children: React.ReactNode; disabled?: boolean; active?: boolean }) {
    if (disabled) {
        return (
            <span className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-200 dark:text-slate-800 cursor-not-allowed">
                {children}
            </span>
        )
    }
    return (
        <Link
            href={href}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${active
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
        >
            {children}
        </Link>
    )
}

