import DashboardLayout from '@/components/DashboardLayout'
import { SkeletonHeader, SkeletonCard, SkeletonLine } from '@/components/PageSkeleton'

export default function Loading() {
    return (
        <DashboardLayout currentPage="calendar">
            <div className="space-y-8">
                <SkeletonHeader />
                <SkeletonCard className="p-6">
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 35 }).map((_, i) => (
                            <SkeletonLine key={i} className="h-20 rounded-lg" />
                        ))}
                    </div>
                </SkeletonCard>
            </div>
        </DashboardLayout>
    )
}
