'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, FileText, Calendar as CalendarIcon, Settings, Menu, X, LogOut, GitBranch } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

interface DashboardLayoutProps {
    children: React.ReactNode
    currentPage: 'dashboard' | 'composer' | 'calendar' | 'settings' | 'workflow'
}

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
    { href: '/composer', label: 'Create Post', icon: FileText, key: 'composer' },
    { href: '/workflow', label: 'Workflow', icon: GitBranch, key: 'workflow' },
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
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-40 px-4 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm shadow-lg shadow-blue-500/20">
                        SM
                    </div>
                    <span>Social Scheduler</span>
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
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
                </div>
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
                fixed left-0 top-0 h-full w-64 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 p-6 z-50
                flex flex-col
                transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                lg:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl shadow-blue-500/20' : '-translate-x-full'}
            `}>
                <Link href="/dashboard" className="flex items-center gap-3 text-xl font-black text-gray-900 dark:text-white mb-10 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                        SM
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Social Scheduler
                    </span>
                </Link>

                <nav className="space-y-1.5">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="font-semibold text-sm">{item.label}</span>
                                {isActive && (
                                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-200/50 dark:border-gray-800/50 space-y-4">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-800/50">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Theme</span>
                        <ThemeToggle />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 dark:text-gray-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 group shadow-sm hover:shadow-red-500/20"
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-semibold text-sm">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 pb-24 lg:pb-0 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px]" />
                </div>

                <div className="p-4 sm:p-6 lg:p-10">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-6 left-6 right-6 h-16 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl z-40 shadow-2xl shadow-blue-500/10 pb-safe ring-1 ring-black/5 dark:ring-white/5">
                <div className="flex items-center justify-around h-full">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all relative ${isActive
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 active:scale-90'
                                    }`}
                            >
                                <Icon size={22} className={`transition-all duration-300 ${isActive ? 'scale-110 -translate-y-1' : 'group-hover:scale-110'}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-tighter transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0.5' : 'opacity-60 scale-90'}`}>
                                    {item.label.split(' ')[0]}
                                </span>
                                {isActive && (
                                    <div className="absolute -bottom-1 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full shadow-[0_-4px_8px_rgba(37,99,235,0.4)]" />
                                )}
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
