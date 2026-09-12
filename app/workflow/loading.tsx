import DashboardLayout from '@/components/DashboardLayout'
import { SkeletonHeader, SkeletonCard } from '@/components/PageSkeleton'

export default function Loading() {
    return (
        <DashboardLayout currentPage="workflow">
            <div className="max-w-6xl mx-auto">
                <SkeletonHeader />
                <SkeletonCard className="h-24 mb-8" />
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
                    <SkeletonCard className="h-96" />
                    <SkeletonCard className="h-96" />
                </div>
            </div>
        </DashboardLayout>
    )
}
