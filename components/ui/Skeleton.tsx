'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
    className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800",
                className
            )}
        />
    )
}

export function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-[30px] p-8 shadow-sm border border-gray-100 dark:border-gray-800/50 flex items-center gap-6">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
    )
}

export function SkeletonTable() {
    return (
        <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-12 w-48" />
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
            ))}
        </div>
    )
}
