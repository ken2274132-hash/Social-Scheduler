import DashboardLayout from '@/components/DashboardLayout'
import { SkeletonHeader, SkeletonStats, SkeletonCard, SkeletonLine } from '@/components/PageSkeleton'

export default function Loading() {
    return (
        <DashboardLayout currentPage="analytics">
            <div className="space-y-8">
                <SkeletonHeader />
                <SkeletonStats />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <SkeletonCard className="p-6 h-64">
                        <SkeletonLine className="h-4 w-32" />
                    </SkeletonCard>
                    <SkeletonCard className="p-6 h-64">
                        <SkeletonLine className="h-4 w-32" />
                    </SkeletonCard>
                </div>
            </div>
        </DashboardLayout>
    )
}
