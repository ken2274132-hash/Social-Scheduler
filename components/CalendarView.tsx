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
                return <CheckCircle size={14} className="text-green-600" />
            case 'failed':
                return <XCircle size={14} className="text-red-600" />
            case 'scheduled':
                return <Clock size={14} className="text-blue-600" />
            default:
                return <AlertCircle size={14} className="text-gray-600" />
        }
    }

    return (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} className="text-gray-900 dark:text-white" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} className="text-gray-900 dark:text-white" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
                        {day}
                    </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
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
                            className={`aspect-square border border-gray-200 dark:border-gray-800 rounded-lg p-2 cursor-pointer hover:border-blue-500 transition-colors group relative ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : ''
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-sm font-medium ${isToday
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-900 dark:text-white'
                                    }`}>
                                    {day}
                                </span>
                                {dayPosts.length > 0 ? (
                                    <span className="text-xs bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                        {dayPosts.length}
                                    </span>
                                ) : (
                                    <Plus size={14} className="text-gray-300 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </div>
                            <div className="space-y-1">
                                {dayPosts.slice(0, 2).map(post => (
                                    <div
                                        key={post.id}
                                        className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5"
                                        title={post.caption}
                                    >
                                        {getStatusIcon(post.status)}
                                        <span className="truncate">
                                            {new Date(post.scheduled_at).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                ))}
                                {dayPosts.length > 2 && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-500 pl-1">
                                        +{dayPosts.length - 2} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 flex gap-6">
                <div className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-400">Scheduled</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-gray-600 dark:text-gray-400">Published</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <XCircle size={16} className="text-red-600" />
                    <span className="text-gray-600 dark:text-gray-400">Failed</span>
                </div>
            </div>
        </div>
    )
}
