/**
 * Skeletons shown while a page's server render is in flight.
 *
 * Every dashboard page is `force-dynamic` and queries Supabase, so a
 * navigation costs a round trip before anything can paint. Without a
 * `loading.tsx` Next.js keeps the OLD page on screen for that whole time and
 * the app reads as frozen — the click appears to do nothing. These give the
 * router something to show instantly instead.
 */

export function SkeletonLine({ className = '' }: { className?: string }) {
    return (
        <div
            className={`bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse ${className}`}
        />
    )
}

export function SkeletonCard({
    className = '',
    children,
}: {
    className?: string
    children?: React.ReactNode
}) {
    return (
        <div
            className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl shadow-sm shadow-slate-200/30 dark:shadow-none ${className}`}
        >
            {children}
        </div>
    )
}

/** Page title and subtitle, matching the real header's rhythm. */
export function SkeletonHeader() {
    return (
        <div className="mb-8">
            <SkeletonLine className="h-8 w-48" />
            <SkeletonLine className="h-4 w-72 mt-3" />
        </div>
    )
}

/** A row of stat tiles, as on the dashboard. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} className="p-6">
                    <SkeletonLine className="h-3 w-20" />
                    <SkeletonLine className="h-8 w-14 mt-4" />
                </SkeletonCard>
            ))}
        </div>
    )
}

/** A card with a header strip and a few list rows inside it. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
    return (
        <SkeletonCard className="overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800/50">
                <SkeletonLine className="h-4 w-36" />
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-5">
                        <SkeletonLine className="w-14 h-14 rounded-lg shrink-0" />
                        <div className="flex-1 min-w-0">
                            <SkeletonLine className="h-4 w-2/3" />
                            <SkeletonLine className="h-3 w-1/3 mt-2" />
                        </div>
                    </div>
                ))}
            </div>
        </SkeletonCard>
    )
}
