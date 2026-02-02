import React from 'react'
import { FileText, Send, Clock, AlertTriangle, BarChart3, TrendingUp, PieChart } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { getWorkspace } from '@/lib/get-workspace'

const platformColors: Record<string, { bg: string; text: string; bar: string }> = {
    instagram: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    facebook: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
    pinterest: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500' },
}

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
    const { workspace, supabase } = await getWorkspace()
    const wid = workspace?.id || ''

    // Run all queries in parallel
    const [
        { count: totalPosts },
        { count: publishedPosts },
        { count: scheduledPosts },
        { count: failedPosts },
        { data: allPosts },
        { data: accounts },
    ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', wid),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', wid).eq('status', 'published'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', wid).eq('status', 'scheduled'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('workspace_id', wid).eq('status', 'failed'),
        supabase.from('posts').select('id, status, scheduled_at, published_at, created_at, social_accounts(platform)').eq('workspace_id', wid).order('created_at', { ascending: false }),
        supabase.from('social_accounts').select('id, platform, account_name, is_active').eq('workspace_id', wid),
    ])

    const total = totalPosts || 0
    const published = publishedPosts || 0
    const scheduled = scheduledPosts || 0
    const failed = failedPosts || 0
    const draft = total - published - scheduled - failed
    const successRate = total > 0 ? Math.round((published / total) * 100) : 0

    // Posts per platform
    const platformCounts: Record<string, { total: number; published: number }> = {}
    allPosts?.forEach((post: any) => {
        const platform = post.social_accounts?.platform?.toLowerCase() || 'unknown'
        if (!platformCounts[platform]) platformCounts[platform] = { total: 0, published: 0 }
        platformCounts[platform].total++
        if (post.status === 'published') platformCounts[platform].published++
    })

    // Posts per month (last 6 months)
    const monthlyData: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        monthlyData[key] = 0
    }
    allPosts?.forEach((post: any) => {
        const d = new Date(post.created_at)
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        if (key in monthlyData) monthlyData[key]++
    })
    const maxMonthly = Math.max(...Object.values(monthlyData), 1)

    return (
        <DashboardLayout currentPage="analytics">
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Analytics</h1>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Overview of your posting activity and performance.</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard label="Total Posts" value={total} icon={<FileText size={18} />} />
                    <StatCard label="Published" value={published} icon={<Send size={18} />} color="text-emerald-500" />
                    <StatCard label="Scheduled" value={scheduled} icon={<Clock size={18} />} color="text-amber-500" />
                    <StatCard label="Failed" value={failed} icon={<AlertTriangle size={18} />} color="text-red-500" />
                </div>

                <div className="grid lg:grid-cols-2 gap-5">
                    {/* Status Breakdown */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-2 mb-5">
                            <PieChart size={18} className="text-indigo-500" />
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Status Breakdown</h2>
                        </div>
                        <div className="space-y-4">
                            <BarRow label="Published" count={published} total={total} color="bg-emerald-500" />
                            <BarRow label="Scheduled" count={scheduled} total={total} color="bg-amber-500" />
                            <BarRow label="Failed" count={failed} total={total} color="bg-red-500" />
                            <BarRow label="Draft" count={draft} total={total} color="bg-slate-400" />
                        </div>
                        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                            <span className="text-sm text-slate-500">Success Rate</span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{successRate}%</span>
                        </div>
                    </div>

                    {/* Platform Breakdown */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-2 mb-5">
                            <BarChart3 size={18} className="text-indigo-500" />
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Posts by Platform</h2>
                        </div>
                        {Object.keys(platformCounts).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(platformCounts)
                                    .sort((a, b) => b[1].total - a[1].total)
                                    .map(([platform, data]) => {
                                        const colors = platformColors[platform] || { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-500', bar: 'bg-slate-400' }
                                        return (
                                            <div key={platform}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{platform}</span>
                                                    <span className="text-sm tabular-nums text-slate-500">{data.total} posts</span>
                                                </div>
                                                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${colors.bar} rounded-full transition-all`}
                                                        style={{ width: `${total > 0 ? (data.total / total) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">{data.published} published</p>
                                            </div>
                                        )
                                    })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 py-8 text-center">No posts yet. Start creating posts to see platform stats.</p>
                        )}
                        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/50">
                            <p className="text-sm text-slate-500">{accounts?.filter((a: any) => a.is_active).length || 0} connected account{(accounts?.filter((a: any) => a.is_active).length || 0) !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>

                {/* Monthly Activity */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp size={18} className="text-indigo-500" />
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Monthly Activity</h2>
                    </div>
                    <div className="flex items-end gap-3 h-48">
                        {Object.entries(monthlyData).map(([month, count]) => (
                            <div key={month} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 tabular-nums">{count}</span>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden relative" style={{ height: '100%' }}>
                                    <div
                                        className="absolute bottom-0 w-full bg-indigo-500 rounded-t-lg transition-all"
                                        style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? '8px' : '0px' }}
                                    />
                                </div>
                                <span className="text-[11px] font-medium text-slate-400">{month}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none">
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

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                <span className="text-sm tabular-nums text-slate-500">{count} <span className="text-slate-400">({pct}%)</span></span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}
