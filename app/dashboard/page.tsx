import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, FileText, Calendar as CalendarIcon, Settings, Instagram, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import ConnectInstagramButton from '@/components/ConnectInstagramButton'
import DashboardLayout from '@/components/DashboardLayout'

export default async function DashboardPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
    const pageSize = 6
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

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

    // Get stats and total count in parallel
    const [
        { count: totalPostsCount },
        { count: publishedPosts },
        { data: connectedAccounts },
        { data: recentPosts, count: totalRecentPosts }
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
            .from('social_accounts')
            .select('*')
            .eq('workspace_id', workspace?.id || '')
            .eq('is_active', true),
        supabase
            .from('posts')
            .select('*, social_accounts(*)', { count: 'exact' })
            .eq('workspace_id', workspace?.id || '')
            .order('created_at', { ascending: false })
            .range(from, to)
    ])

    const totalPages = Math.ceil((totalRecentPosts || 0) / pageSize)
    const planLimit = profile?.post_limit || 10;
    const usagePercentage = Math.min(((totalPostsCount || 0) / planLimit) * 100, 100);

    return (
        <DashboardLayout currentPage="dashboard">
            <div className="space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        Hello {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]} <span className="animate-bounce-slow">👋</span>,
                    </h1>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#5932EA] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search"
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border-none rounded-xl text-sm w-full md:w-64 shadow-sm focus:ring-2 focus:ring-[#5932EA]/20 transition-all outline-none"
                        />
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Total Posts"
                        value={totalPostsCount || 0}
                        icon={<FileText size={24} />}
                        trend="+16% this month"
                        trendType="up"
                        color="green"
                    />
                    <StatCard
                        title="Published"
                        value={publishedPosts || 0}
                        icon={<Instagram size={24} />}
                        trend="-1% this month"
                        trendType="down"
                        color="red"
                    />
                    <StatCard
                        title="Active Now"
                        value={connectedAccounts?.length || 0}
                        icon={<Instagram size={24} />}
                        color="purple"
                        isUserCount
                    />
                </div>

                {/* Content Table Section */}
                <section className="bg-white dark:bg-gray-900 rounded-[30px] p-8 shadow-sm border border-gray-100 dark:border-gray-800/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Posts</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    className="pl-9 pr-4 py-2 bg-[#F9FBFF] dark:bg-gray-800 border-none rounded-lg text-xs w-full md:w-48 outline-none focus:ring-1 focus:ring-[#5932EA]/30 transition-all font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-[#F9FBFF] dark:bg-gray-800 px-3 py-2 rounded-lg cursor-pointer group">
                                <span className="text-[12px] text-[#7E7E7E] font-medium">Short by :</span>
                                <span className="text-[12px] text-[#3D3C3C] dark:text-gray-200 font-bold flex items-center gap-1 group-hover:text-[#5932EA] transition-colors">
                                    Newest <ChevronRight size={14} className="rotate-90" />
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <th className="pb-4 text-[14px] font-medium text-[#B5B7C0]">Content Preview</th>
                                    <th className="pb-4 text-[14px] font-medium text-[#B5B7C0]">Platform</th>
                                    <th className="pb-4 text-[14px] font-medium text-[#B5B7C0]">Schedule Date</th>
                                    <th className="pb-4 text-[14px] font-medium text-[#B5B7C0]">Account</th>
                                    <th className="pb-4 text-[14px] font-medium text-[#B5B7C0] text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {recentPosts && recentPosts.length > 0 ? (
                                    recentPosts.map((post: any) => (
                                        <tr key={post.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="py-5 pr-4">
                                                <p className="text-[14px] font-medium text-[#292D32] dark:text-gray-200 truncate max-w-[200px]">
                                                    {post.caption || 'No caption'}
                                                </p>
                                            </td>
                                            <td className="py-5">
                                                <p className="text-[14px] font-medium text-[#292D32] dark:text-gray-200">
                                                    {post.social_accounts?.platform || 'Instagram'}
                                                </p>
                                            </td>
                                            <td className="py-5">
                                                <p className="text-[14px] font-medium text-[#292D32] dark:text-gray-200">
                                                    {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                </p>
                                            </td>
                                            <td className="py-5">
                                                <p className="text-[14px] font-medium text-[#292D32] dark:text-gray-200">
                                                    @{post.social_accounts?.account_name || 'unknown'}
                                                </p>
                                            </td>
                                            <td className="py-5 flex justify-center">
                                                <span className={`min-w-[80px] text-center px-3 py-1.5 rounded-lg text-[14px] font-bold border ${post.status === 'published' ? 'bg-[#16C09820] text-[#008767] border-[#00B087]' :
                                                    post.status === 'failed' ? 'bg-[#FF000020] text-[#DF0404] border-[#FF0000]' :
                                                        'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                                                    {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-gray-400 font-medium">
                                            No recent activity found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8">
                        <p className="text-[14px] text-[#B5B7C0] font-medium">
                            Showing data {from + 1} to {Math.min(to + 1, totalRecentPosts || 0)} of {totalRecentPosts?.toLocaleString() || 0} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <Link
                                href={`/dashboard?page=${Math.max(1, page - 1)}`}
                                className={`w-8 h-8 flex items-center justify-center rounded-md bg-[#F5F5F5] dark:bg-gray-800 text-[#404B69] dark:text-gray-400 hover:bg-[#5932EA] hover:text-white transition-all text-xs ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                            >
                                &lt;
                            </Link>

                            {/* Simple pagination buttons */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = i + 1
                                return (
                                    <Link
                                        key={p}
                                        href={`/dashboard?page=${p}`}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md border text-xs transition-all ${p === page ? 'bg-[#5932EA] text-white border-[#5932EA]' : 'bg-[#F5F5F5] dark:bg-gray-800 text-[#404B69] dark:text-gray-400 border-transparent hover:border-[#5932EA]'}`}
                                    >
                                        {p}
                                    </Link>
                                )
                            })}

                            {totalPages > 5 && <span className="px-1 text-gray-400">...</span>}
                            {totalPages > 5 && (
                                <Link
                                    href={`/dashboard?page=${totalPages}`}
                                    className={`w-8 h-8 flex items-center justify-center rounded-md bg-[#F5F5F5] dark:bg-gray-800 text-[#404B69] dark:text-gray-400 hover:bg-[#5932EA] hover:text-white transition-all text-xs ${page === totalPages ? 'bg-[#5932EA] text-white border-[#5932EA]' : ''}`}
                                >
                                    {totalPages}
                                </Link>
                            )}

                            <Link
                                href={`/dashboard?page=${Math.min(totalPages, page + 1)}`}
                                className={`w-8 h-8 flex items-center justify-center rounded-md bg-[#F5F5F5] dark:bg-gray-800 text-[#404B69] dark:text-gray-400 hover:bg-[#5932EA] hover:text-white transition-all text-xs ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
                            >
                                &gt;
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    )
}

function StatCard({ title, value, icon, trend, trendType, color, isUserCount }: { title: string; value: string | number; icon: React.ReactNode; trend?: string; trendType?: 'up' | 'down'; color: 'blue' | 'green' | 'purple' | 'orange' | 'red'; isUserCount?: boolean }) {
    const bgColors = {
        blue: 'bg-[#D3FFE7]',
        green: 'bg-[#D3FFE7]',
        purple: 'bg-[#EFFAFF]',
        orange: 'bg-[#FFF2E8]',
        red: 'bg-[#FFF2E8]'
    }

    const textColors = {
        blue: 'text-[#00AC4F]',
        green: 'text-[#00AC4F]',
        purple: 'text-[#037092]',
        orange: 'text-[#DF0404]',
        red: 'text-[#DF0404]'
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-[30px] p-8 shadow-sm border border-gray-100 dark:border-gray-800/50 flex items-center gap-6">
            <div className={`w-20 h-20 rounded-full ${bgColors[color]} flex items-center justify-center shrink-0`}>
                <div className={`${textColors[color]}`}>
                    {icon}
                </div>
            </div>

            <div className="flex flex-col">
                <p className="text-[14px] font-medium text-[#ACACAC] mb-1">{title}</p>
                <h3 className="text-[32px] font-bold text-[#333333] dark:text-white leading-tight">{value.toLocaleString()}</h3>

                {trend && (
                    <div className="flex items-center gap-1 mt-1">
                        <span className={`text-[12px] font-bold ${trendType === 'up' ? 'text-[#00AC4F]' : 'text-[#D0004B]'}`}>
                            {trendType === 'up' ? '↑' : '↓'} {trend.split(' ')[0]}
                        </span>
                        <span className="text-[12px] text-[#292D32] dark:text-gray-400">
                            {trend.split(' ').slice(1).join(' ')}
                        </span>
                    </div>
                )}

                {isUserCount && (
                    <div className="flex -space-x-2 mt-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 123}`} alt="User" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
