'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Users, AlertTriangle, Settings, Menu, X, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdminLayoutProps {
    children: React.ReactNode
    currentPage: 'dashboard' | 'users' | 'logs' | 'settings'
}

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
    { href: '/admin/users', label: 'Users', icon: Users, key: 'users' },
    { href: '/admin/logs', label: 'Failed Posts', icon: AlertTriangle, key: 'logs' },
    { href: '/admin/settings', label: 'Settings', icon: Settings, key: 'settings' },
]

export default function AdminLayout({ children, currentPage }: AdminLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gray-950 border-b border-gray-800 z-40 px-4 flex items-center justify-between">
                <Link href="/admin" className="flex items-center gap-2 text-lg font-bold text-white">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white">
                        <ShieldCheck size={18} />
                    </div>
                    <span className="hidden sm:inline">Admin Panel</span>
                </Link>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? (
                        <X size={24} className="text-gray-400" />
                    ) : (
                        <Menu size={24} className="text-gray-400" />
                    )}
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Side Navigation */}
            <aside className={`
                fixed left-0 top-0 h-full w-64 bg-gray-950 border-r border-gray-800 p-6 z-50
                flex flex-col
                transform transition-transform duration-300 ease-in-out
                lg:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Link href="/admin" className="flex items-center gap-2 text-xl font-bold text-white mb-8">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white">
                        <ShieldCheck size={18} />
                    </div>
                    Admin Panel
                </Link>

                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                    ? 'bg-red-900/30 text-red-400'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-800">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2 w-full text-left text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    )
}
