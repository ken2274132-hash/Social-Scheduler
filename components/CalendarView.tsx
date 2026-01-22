'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, XCircle, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Post = {
    id: string
    caption: string
    scheduled_at: string
    status: string
    social_accounts: {
        account_name: string | null
        platform: string
    }
    media_assets: {
        url: string
    } | null
}

export default function CalendarView({ posts }: { posts: Post[] }) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const router = useRouter()

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        return { daysInMonth, startingDayOfWeek, year, month }
    }

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const getPostsForDay = (day: number) => {
        return posts.filter(post => {
            const postDate = new Date(post.scheduled_at)
            return postDate.getFullYear() === year &&
                postDate.getMonth() === month &&
                postDate.getDate() === day
        })
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'published':
                return <CheckCircle size={10} className="text-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            case 'failed':
                return <XCircle size={10} className="text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            case 'scheduled':
                return <Clock size={10} className="text-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            default:
                return <AlertCircle size={10} className="text-gray-400" />
        }
    }

    return (
        <div className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm hover:shadow-2xl transition-all duration-700">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-10 relative">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-8 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                        {currentDate.toLocaleDateString('en-US', { month: 'long' })}
                        <span className="ml-2 text-blue-600 opacity-50">{year}</span>
                    </h2>
                </div>

                <div className="flex gap-3 bg-gray-100/50 dark:bg-gray-900/50 p-2 rounded-2xl backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50">
                    <button
                        onClick={prevMonth}
                        className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all hover:scale-110 active:scale-90 shadow-sm"
                    >
                        <ChevronLeft size={18} className="text-gray-900 dark:text-white" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all hover:scale-110 active:scale-90 shadow-sm"
                    >
                        <ChevronRight size={18} className="text-gray-900 dark:text-white" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-4">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest pb-4">
                        {day}
                    </div>
                ))}

                {/* Empty cells */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-3xl bg-gray-50/30 dark:bg-gray-900/10 border border-transparent" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dayPosts = getPostsForDay(day)
                    const isToday = new Date().getDate() === day &&
                        new Date().getMonth() === month &&
                        new Date().getFullYear() === year

                    return (
                        <div
                            key={day}
                            onClick={() => {
                                const paddingDay = day < 10 ? `0${day}` : day
                                const paddingMonth = (month + 1) < 10 ? `0${month + 1}` : (month + 1)
                                router.push(`/composer?date=${year}-${paddingMonth}-${paddingDay}`)
                            }}
                            className={`aspect-square relative group/day rounded-3xl border transition-all duration-500 cursor-pointer overflow-hidden p-3 ${isToday
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/30 scale-[1.02] z-10'
                                    : 'bg-white/40 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50 hover:border-blue-500/50 hover:shadow-lg hover:-translate-y-1'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-sm font-black ${isToday ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                    {day}
                                </span>
                                {!isToday && dayPosts.length > 0 && (
                                    <div className="flex -space-x-1">
                                        {dayPosts.slice(0, 3).map((post, idx) => (
                                            <div key={post.id} className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-950" />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                {dayPosts.slice(0, 1).map(post => (
                                    <div
                                        key={post.id}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(`/composer?postId=${post.id}`)
                                        }}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-all ${isToday
                                                ? 'bg-white/20 text-white'
                                                : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className={`${isToday ? 'text-white' : ''}`}>{getStatusIcon(post.status)}</div>
                                        <span className="text-[10px] font-black uppercase tracking-tighter truncate">
                                            {new Date(post.scheduled_at).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Hover Plus Button */}
                            {!isToday && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-opacity bg-blue-500/5 backdrop-blur-[2px]">
                                    <div className="w-8 h-8 rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center text-blue-600 animate-in zoom-in-50 duration-300">
                                        <Plus size={16} />
                                    </div>
                                </div>
                            )}

                            {/* Today Glow */}
                            {isToday && (
                                <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-3xl pointer-events-none" />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Legend & Stats */}
            <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-2h-2 p-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Clock size={12} className="text-blue-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scheduled</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 p-1 rounded-full bg-green-100 dark:bg-green-900/30">
                            <CheckCircle size={12} className="text-green-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live</span>
                    </div>
                </div>

                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-2xl">
                    {posts.length} Total Campaigns
                </div>
            </div>
        </div>
    )
}
