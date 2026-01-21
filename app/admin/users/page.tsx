'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Shield, Ban, Eye, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchUsers()
    }, [])

    async function fetchUsers() {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            // Fetch users
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })

            if (userError) throw userError

            // Fetch usage (posts across workspaces)
            const { data: postData } = await supabase
                .from('posts')
                .select('workspace_id, workspaces(owner_id)')

            const usageMap: Record<string, number> = {}
            postData?.forEach((p: any) => {
                const ownerId = p.workspaces?.owner_id
                if (ownerId) {
                    usageMap[ownerId] = (usageMap[ownerId] || 0) + 1
                }
            })

            setUsers(userData?.map(u => ({
                ...u,
                usage: usageMap[u.id] || 0
            })) || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function updateStatusAndRole(userId: string, updates: { status?: string, role?: string }) {
        setUpdating(userId)
        setError(null)
        try {
            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ...updates })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to update')

            setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u))
            setSuccess(`User updated successfully`)
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUpdating(null)
        }
    }

    async function updatePostLimit(userId: string, newLimit: number) {
        setUpdating(userId)
        setError(null)
        setSuccess(null)

        try {
            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, postLimit: newLimit })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to update')

            setUsers(users.map(u => u.id === userId ? { ...u, post_limit: newLimit } : u))
            setSuccess(`Updated limit for user successfully`)
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUpdating(null)
        }
    }

    if (loading) {
        return (
            <AdminLayout currentPage="users">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-red-500" size={40} />
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout currentPage="users">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">User Management</h1>
                        <p className="text-gray-400 mt-1">{users.length} total users</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-lg flex items-center gap-3 text-red-400">
                        <AlertCircle size={20} />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-900/20 border border-green-900/30 rounded-lg flex items-center gap-3 text-green-400">
                        <CheckCircle2 size={20} />
                        <p className="text-sm font-medium">{success}</p>
                    </div>
                )}

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900 border-b border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Storage</th>
                                    <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Tokens</th>
                                    <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {users.map((user) => {
                                    const limit = user.post_limit ?? 10
                                    const usagePercent = Math.min((user.usage / limit) * 100, 100)

                                    return (
                                        <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-white">{user.email || 'No email'}</div>
                                                <div className="text-xs text-gray-500 font-mono truncate max-w-[150px]">{user.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => updateStatusAndRole(user.id, { role: e.target.value })}
                                                    disabled={updating === user.id}
                                                    className="bg-gray-900 border border-gray-700 rounded text-xs px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-red-500 appearance-none cursor-pointer"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5 min-w-[100px]">
                                                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                        <span>{user.usage} / {limit}</span>
                                                        <span>{usagePercent.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${usagePercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={user.post_limit ?? 10}
                                                        onChange={(e) => {
                                                            const newVal = parseInt(e.target.value)
                                                            if (!isNaN(newVal)) {
                                                                setUsers(users.map(u => u.id === user.id ? { ...u, post_limit: newVal } : u))
                                                            }
                                                        }}
                                                        className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                                    />
                                                    <button
                                                        onClick={() => updatePostLimit(user.id, user.post_limit)}
                                                        disabled={updating === user.id}
                                                        className="p-1.5 text-gray-400 hover:text-green-400 transition-colors disabled:opacity-50"
                                                        title="Save Tokens"
                                                    >
                                                        {updating === user.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.status}
                                                    onChange={(e) => updateStatusAndRole(user.id, { status: e.target.value })}
                                                    disabled={updating === user.id}
                                                    className={`border border-gray-700 rounded text-xs px-2 py-1 focus:outline-none focus:ring-1 appearance-none cursor-pointer ${user.status === 'active' ? 'bg-green-900/20 text-green-400 focus:ring-green-500' : 'bg-red-900/20 text-red-400 focus:ring-red-500'
                                                        }`}
                                                >
                                                    <option value="active" className="bg-gray-900">Active</option>
                                                    <option value="suspended" className="bg-gray-900">Suspended</option>
                                                    <option value="banned" className="bg-gray-900">Banned</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
