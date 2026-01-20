import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Users, FileText, AlertTriangle, HardDrive } from 'lucide-react'

// Force dynamic rendering to avoid build-time DB queries
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const supabase = await createClient()

    // Get session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        redirect('/login')
    }

    // ... stats will use service role in API route
    // For now, fetch basic counts

    // Total users
    const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

    // Today's posts
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

    // Failed posts
    const { count: failedPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')

    // Total workspaces
    const { count: totalWorkspaces } = await supabase
        .from('workspaces')
        .select('*', { count: 'exact', head: true })

    const stats = [
        {
            label: 'Total Users',
            value: totalUsers || 0,
            icon: Users,
            color: 'bg-blue-500',
        },
        {
            label: 'Posts Today',
            value: todayPosts || 0,
            icon: FileText,
            color: 'bg-green-500',
        },
        {
            label: 'Failed Posts',
            value: failedPosts || 0,
            icon: AlertTriangle,
            color: failedPosts && failedPosts > 0 ? 'bg-red-500' : 'bg-gray-500',
        },
        {
            label: 'Workspaces',
            value: totalWorkspaces || 0,
            icon: HardDrive,
            color: 'bg-purple-500',
        },
    ]

    return (
        <AdminLayout currentPage="dashboard">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">
                    Admin Dashboard
                </h1>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {stats.map((stat) => {
                        const Icon = stat.icon
                        return (
                            <div
                                key={stat.label}
                                className="bg-gray-800 rounded-xl p-6 border border-gray-700"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`${stat.color} p-3 rounded-lg`}>
                                        <Icon size={24} className="text-white" />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-white mb-1">
                                    {stat.value}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    {stat.label}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                    <div className="flex flex-wrap gap-4">
                        <a
                            href="/admin/users"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Manage Users
                        </a>
                        <a
                            href="/admin/logs"
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            View Failed Posts
                        </a>
                        <a
                            href="/dashboard"
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                        >
                            Back to App
                        </a>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
