'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, FileText, Calendar as CalendarIcon, Settings, Menu, X, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DashboardLayoutProps {
    children: React.ReactNode
    currentPage: 'dashboard' | 'composer' | 'calendar' | 'settings'
}

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
    { href: '/composer', label: 'Create Post', icon: FileText, key: 'composer' },
    { href: '/calendar', label: 'Calendar', icon: CalendarIcon, key: 'calendar' },
    { href: '/settings', label: 'Settings', icon: Settings, key: 'settings' },
]

export default function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // Cron Job Simulator for Local Development
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('⏰ Starting local cron simulator...')
            const runCron = async () => {
                try {
                    await fetch('/api/cron/publish')
                    console.log('⏰ Cron tick executed')
                } catch (e) {
                    console.error('⏰ Cron tick failed', e)
                }
            }

            // Run immediately on mount
            runCron()

            // Then run every 60 seconds
            const interval = setInterval(runCron, 60 * 1000)
            return () => clearInterval(interval)
        }
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 z-40 px-4 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
                        SM
                    </div>
                    <span className="hidden sm:inline">Social Scheduler</span>
                </Link>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? (
                        <X size={24} className="text-gray-600 dark:text-gray-400" />
                    ) : (
                        <Menu size={24} className="text-gray-600 dark:text-gray-400" />
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

            {/* Side Navigation - Desktop always visible, Mobile slides in */}
            <aside className={`
                fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 p-6 z-50
                flex flex-col
                transform transition-transform duration-300 ease-in-out
                lg:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white mb-8">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
                        SM
                    </div>
                    Social Scheduler
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
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <Icon size={20} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 w-full text-left text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 pt-20 p-4 sm:p-6 lg:p-8">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 z-40 safe-area-bottom">
                <div className="flex items-center justify-around h-16">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${isActive
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="text-xs">{item.label.split(' ')[0]}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
