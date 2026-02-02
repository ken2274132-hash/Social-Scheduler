'use client'

import Link from 'next/link'
import { LayoutDashboard, PenSquare, Calendar as CalendarIcon, Settings, LogOut, GitBranch, Sun, Moon, BarChart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

interface DashboardLayoutProps {
    children: React.ReactNode
    currentPage: 'dashboard' | 'composer' | 'calendar' | 'settings' | 'workflow'
}

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
    { href: '/composer', label: 'Create Post', icon: PenSquare, key: 'composer' },
    { href: '/workflow', label: 'Workflow', icon: GitBranch, key: 'workflow' },
    { href: '/calendar', label: 'Calendar', icon: CalendarIcon, key: 'calendar' },
    { href: '#', label: 'Analytics', icon: BarChart, key: 'analytics' },
    { href: '/settings', label: 'Settings', icon: Settings, key: 'settings' },
]

export default function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
    const { theme, setTheme } = useTheme()
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/50 z-40 px-4 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-[8px] font-bold">SM</div>
                    <span>Social Scheduler</span>
                </Link>
                <div className="flex items-center gap-2">
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-[260px] bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/50 hidden lg:flex flex-col z-50">
                <div className="px-6 py-16">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-blue-600/20">SM</div>
                        <span className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight">Social Scheduler</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-0.5">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] transition-all duration-200 ${isActive
                                    ? 'bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-medium'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="px-4 pb-6 space-y-0.5">
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all"
                    >
                        {theme === 'dark' ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
                        <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                    >
                        <LogOut size={20} strokeWidth={1.5} />
                        <span>Log out</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="lg:ml-[260px] min-h-screen pt-14 lg:pt-0">
                <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/50 z-40 pb-safe">
                <div className="flex items-center justify-around h-full">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                    }`}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                                <span className="text-[10px] font-medium tracking-tight">{item.label.split(' ')[0]}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
