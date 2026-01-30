'use client'

import { cn } from '@/lib/utils'

type StatCardColor = 'blue' | 'green' | 'purple' | 'orange' | 'red'

interface StatCardProps {
    title: string
    value: string | number
    icon: React.ReactNode
    trend?: string
    trendType?: 'up' | 'down'
    color: StatCardColor
}

const bgColors: Record<StatCardColor, string> = {
    blue: 'bg-success-light',
    green: 'bg-success-light',
    purple: 'bg-info-light',
    orange: 'bg-danger-light',
    red: 'bg-danger-light'
}

const textColors: Record<StatCardColor, string> = {
    blue: 'text-success',
    green: 'text-success',
    purple: 'text-info',
    orange: 'text-danger',
    red: 'text-danger'
}

export default function StatCard({ title, value, icon, trend, trendType, color }: StatCardProps) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-[30px] p-8 shadow-sm border border-gray-100 dark:border-gray-800/50 flex items-center gap-6 transition-all hover:shadow-md">
            <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center shrink-0",
                bgColors[color]
            )}>
                <div className={textColors[color]}>
                    {icon}
                </div>
            </div>

            <div className="flex flex-col">
                <p className="text-sm font-medium text-muted mb-1">{title}</p>
                <h3 className="text-[32px] font-bold text-heading dark:text-white leading-tight">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </h3>

                {trend && (
                    <div className="flex items-center gap-1 mt-1">
                        <span className={cn(
                            "text-xs font-bold",
                            trendType === 'up' ? 'text-success' : 'text-danger'
                        )}>
                            {trendType === 'up' ? '↑' : '↓'} {trend.split(' ')[0]}
                        </span>
                        <span className="text-xs text-heading dark:text-gray-400">
                            {trend.split(' ').slice(1).join(' ')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
