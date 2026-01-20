import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { AlertTriangle, RefreshCw, Instagram, Facebook } from 'lucide-react'

export default async function AdminLogsPage() {
    const supabase = await createClient()

    // Get session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        redirect('/login')
    }

    // Fetch failed posts with related data
    const { data: failedPosts, error } = await supabase
        .from('posts')
        .select(`
            *,
            social_accounts (
                platform,
                account_name
            ),
            workspaces (
                name
            )
        `)
        .eq('status', 'failed')
        .order('updated_at', { ascending: false })
        .limit(50)

    return (
        <AdminLayout currentPage="logs">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <AlertTriangle className="text-red-500" />
                        Failed Posts
                    </h1>
                    <p className="text-gray-400">
                        {failedPosts?.length || 0} failed posts
                    </p>
                </div>

                {/* Failed Posts List */}
                <div className="space-y-4">
                    {failedPosts && failedPosts.length > 0 ? (
                        failedPosts.map((post) => (
                            <div
                                key={post.id}
                                className="bg-gray-800 rounded-xl border border-gray-700 p-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {post.social_accounts?.platform === 'instagram' ? (
                                                <Instagram size={20} className="text-pink-500" />
                                            ) : (
                                                <Facebook size={20} className="text-blue-500" />
                                            )}
                                            <span className="text-white font-medium">
                                                {post.social_accounts?.account_name || 'Unknown Account'}
                                            </span>
                                            <span className="text-gray-500">•</span>
                                            <span className="text-gray-400 text-sm">
                                                {post.workspaces?.name || 'Unknown Workspace'}
                                            </span>
                                        </div>

                                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                                            {post.caption || 'No caption'}
                                        </p>

                                        {/* Error Message */}
                                        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3">
                                            <p className="text-red-400 text-sm font-mono">
                                                {post.error_message || 'Unknown error'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                            <span>Scheduled: {new Date(post.scheduled_at).toLocaleString()}</span>
                                            <span>•</span>
                                            <span>ID: {post.id.slice(0, 8)}</span>
                                        </div>
                                    </div>

                                    <button
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                                    >
                                        <RefreshCw size={16} />
                                        Retry
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                            <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                All Clear!
                            </h3>
                            <p className="text-gray-400">
                                No failed posts at the moment. Everything is running smoothly.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
