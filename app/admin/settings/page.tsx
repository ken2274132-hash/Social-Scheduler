import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Settings, Bell, Globe, Mail, Shield, Save } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminSettings() {
    const supabase = await createClient()

    // Get session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        redirect('/login')
    }

    // In a real app, these would come from a config table in Supabase
    const settings = [
        {
            group: 'General',
            icon: Globe,
            items: [
                { label: 'Site Name', value: 'Social Media Scheduler', type: 'text' },
                { label: 'Support Email', value: 'support@example.com', type: 'email' },
                { label: 'Maintenance Mode', value: false, type: 'toggle' },
            ]
        },
        {
            group: 'Security',
            icon: Shield,
            items: [
                { label: 'Admin Approval for New Users', value: true, type: 'toggle' },
                { label: 'Session Timeout (hours)', value: '24', type: 'number' },
            ]
        },
        {
            group: 'Notifications',
            icon: Bell,
            items: [
                { label: 'Email on Failed Posts', value: true, type: 'toggle' },
                { label: 'Daily Status Report', value: true, type: 'toggle' },
            ]
        }
    ]

    return (
        <AdminLayout currentPage="settings">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">Admin Settings</h1>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>

                <div className="space-y-6">
                    {settings.map((group) => {
                        const GroupIcon = group.icon
                        return (
                            <div key={group.group} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50 flex items-center gap-3">
                                    <GroupIcon size={20} className="text-red-400" />
                                    <h2 className="text-lg font-semibold text-white">{group.group}</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {group.items.map((item) => (
                                        <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">{item.label}</p>
                                            </div>
                                            <div className="flex-1 sm:max-w-xs w-full">
                                                {item.type === 'toggle' ? (
                                                    <div className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${item.value ? 'bg-red-600' : 'bg-gray-600'}`}>
                                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${item.value ? 'translate-x-6' : ''}`} />
                                                    </div>
                                                ) : (
                                                    <input
                                                        type={item.type}
                                                        defaultValue={item.value as string}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-900/30 rounded-lg flex items-start gap-3">
                    <div className="p-2 bg-yellow-900/40 rounded-lg">
                        <Shield size={20} className="text-yellow-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-yellow-200">System Information</p>
                        <p className="text-xs text-yellow-200/70 mt-1">
                            Environment: {process.env.NODE_ENV} | Supabase Connected: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Yes' : 'No'}
                        </p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
