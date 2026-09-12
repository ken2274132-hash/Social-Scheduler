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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

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

    const formatTime = (value: string) =>
        new Date(value).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'published':
                return <CheckCircle size={10} className="text-emerald-500 shrink-0" />
            case 'failed':
                return <XCircle size={10} className="text-red-500 shrink-0" />
            case 'scheduled':
                return <Clock size={10} className="text-orange-500 shrink-0" />
            default:
                return <AlertCircle size={10} className="text-slate-400 shrink-0" />
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none animate-in fade-in duration-500">
            {/* Calendar Header */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-4 min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                        {/* Short month under sm: "September 2026" truncated to
                            "Septemb..." at 320px, which hid the month entirely. */}
                        <span className="sm:hidden">{currentDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="hidden sm:inline">{currentDate.toLocaleDateString('en-US', { month: 'long' })}</span>
                        <span className="ml-2 text-slate-400 font-medium">{year}</span>
                    </h2>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                        onClick={prevMonth}
                        aria-label="Previous month"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={nextMonth}
                        aria-label="Next month"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-3 sm:p-8">
                <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden">
                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="bg-slate-50/50 dark:bg-slate-900/50 py-2 sm:py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span className="sm:hidden" aria-hidden="true">{day.charAt(0)}</span>
                            <span className="sr-only sm:not-sr-only">{day}</span>
                        </div>
                    ))}

                    {/* Empty cells */}
                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-white dark:bg-slate-900 min-h-[3.5rem] sm:min-h-0 sm:aspect-square" />
                    ))}

                    {/* Days of the month */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const dayPosts = getPostsForDay(day)
                        const cellDate = new Date(year, month, day)
                        const isToday = today.getTime() === cellDate.getTime()
                        const isPast = cellDate < today
                        const dateLabel = cellDate.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })
                        const paddingDay = day < 10 ? `0${day}` : `${day}`
                        const paddingMonth = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`

                        return (
                            <div
                                key={day}
                                className={`bg-white dark:bg-slate-900 min-h-[3.5rem] sm:min-h-0 sm:aspect-square relative group/day p-1 sm:p-3 transition-all duration-200 ${isPast ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                    }`}
                            >
                                {/* Full-cell target: schedule a new post on this day */}
                                <button
                                    type="button"
                                    disabled={isPast}
                                    onClick={() => {
                                        router.push(`/composer?date=${year}-${paddingMonth}-${paddingDay}`)
                                    }}
                                    aria-label={isPast ? dateLabel : `Schedule a post on ${dateLabel}`}
                                    className="absolute inset-0 z-0 w-full h-full disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset"
                                />

                                <div className="relative z-10 pointer-events-none">
                                    <div className="flex justify-between items-start gap-1">
                                        <span className={`text-[11px] sm:text-sm font-semibold rounded-md sm:rounded-lg w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center shrink-0 transition-colors ${isToday
                                            ? 'bg-orange-700 text-white shadow-sm shadow-orange-700/20'
                                            : isPast ? 'text-slate-300 dark:text-slate-700' : 'text-slate-900 dark:text-white'
                                            }`}>
                                            {day}
                                        </span>
                                        {!isPast && dayPosts.length > 0 && (
                                            <div className="hidden sm:flex -space-x-1">
                                                {dayPosts.slice(0, 2).map((post) => (
                                                    <div key={post.id} className="w-1.5 h-1.5 rounded-full bg-orange-500 ring-2 ring-white dark:ring-slate-900" />
                                                ))}
                                                {dayPosts.length > 2 && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-1 sm:mt-2 space-y-1">
                                        {dayPosts.slice(0, 1).map(post => (
                                            <button
                                                key={post.id}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    router.push(`/composer?edit=${post.id}`)
                                                }}
                                                aria-label={`Edit post scheduled for ${formatTime(post.scheduled_at)} on ${dateLabel}`}
                                                className={`pointer-events-auto w-full flex items-center justify-center sm:justify-start gap-0.5 sm:gap-1.5 px-1 sm:px-2 py-1 rounded-md sm:rounded-lg border text-[10px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isPast
                                                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400'
                                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 group-hover/day:border-orange-200 dark:group-hover/day:border-orange-900 text-slate-700 dark:text-slate-300'
                                                    }`}
                                            >
                                                {getStatusIcon(post.status)}
                                                <span className="hidden sm:block truncate">
                                                    {formatTime(post.scheduled_at)}
                                                </span>
                                                {dayPosts.length > 1 && (
                                                    <span className="sm:hidden text-[9px] font-bold leading-none">
                                                        +{dayPosts.length - 1}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Hover Plus - Only for non-past days */}
                                {!isPast && !isToday && (
                                    <div className="absolute inset-0 z-20 hidden sm:flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-all pointer-events-none">
                                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-orange-700 scale-90 group-hover/day:scale-100 transition-transform">
                                            <Plus size={16} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="px-4 sm:px-8 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-wrap gap-3 sm:gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        Scheduled
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Published
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Failed
                    </div>
                </div>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-slate-900 dark:text-white">{posts.length}</span> Total Posts
                </div>
            </div>
        </div>
    )
}
