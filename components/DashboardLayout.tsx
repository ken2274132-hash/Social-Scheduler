'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, FileText, Calendar as CalendarIcon, Settings, Menu, X, LogOut, GitBranch, Hexagon, ChevronRight, Search, Sun, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
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
    const [user, setUser] = useState<any>(null)
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()
    }, [])

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
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-40 px-4 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                    <div className="w-8 h-8 bg-[#5932EA] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        SM
                    </div>
                    <span className="tracking-tight">Social Scheduler</span>
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                </div>
            </header>


            {/* Side Navigation - Desktop always visible, Mobile slides in */}
            <aside className={`
                fixed left-0 top-0 h-full w-[280px] bg-white dark:bg-black border-r border-gray-100 dark:border-gray-800/50 p-7 z-50
                flex flex-col hidden lg:flex
            `}>
                <Link href="/dashboard" className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-10 group">
                    <div className="w-9 h-9 bg-[#5932EA] rounded-xl flex items-center justify-center text-white text-base font-bold shadow-lg shadow-[#5932EA]/20 group-hover:scale-110 transition-transform">
                        SM
                    </div>
                    <div className="flex flex-col">
                        <span className="tracking-tight leading-none text-xl">Social Scheduler</span>
                    </div>
                </Link>

                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 relative group ${isActive
                                    ? 'bg-[#5932EA] text-white shadow-lg shadow-[#5932EA]/20'
                                    : 'text-[#9197B3] hover:bg-gray-50 dark:hover:bg-gray-900/40 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className={`opacity-80 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="font-medium text-[15px] flex-1">{item.label}</span>
                                {!isActive && <ChevronRight size={16} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto space-y-3">
                    {/* Theme Toggle Card */}
                    <div
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="bg-[#F9FBFF] dark:bg-gray-900/50 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border border-gray-100 dark:border-gray-800/50 group"
                    >
                        <span className="text-[11px] font-bold text-[#9197B3] uppercase tracking-wider">Theme</span>
                        {theme === 'dark' ? (
                            <Sun size={20} className="text-yellow-500 transition-transform group-hover:rotate-12" />
                        ) : (
                            <Moon size={20} className="text-[#9197B3] transition-transform group-hover:-rotate-12" />
                        )}
                    </div>

                    {/* Logout Card */}
                    <div
                        onClick={handleLogout}
                        className="bg-[#F9FBFF] dark:bg-gray-900/50 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-all border border-gray-100 dark:border-gray-800/50 group"
                    >
                        <span className="text-[11px] font-bold text-[#9197B3] group-hover:text-red-500 uppercase tracking-wider transition-colors">Logout</span>
                        <LogOut size={20} className="text-[#9197B3] group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-[280px] min-h-screen pt-16 lg:pt-0 pb-24 lg:pb-0 relative bg-[#FAFBFF] dark:bg-black">
                <div className="p-4 sm:p-6 lg:p-10 max-w-[1400px] mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-6 left-6 right-6 h-16 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl z-40 shadow-lg pb-safe">
                <div className="flex items-center justify-around h-full">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all relative ${isActive
                                    ? 'text-[#5932EA]'
                                    : 'text-gray-400'
                                    }`}
                            >
                                <Icon size={22} className={`transition-all duration-300 ${isActive ? 'scale-110' : ''}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                    {item.label.split(' ')[0]}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
