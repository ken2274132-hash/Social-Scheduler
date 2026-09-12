import DashboardLayout from '@/components/DashboardLayout'
import { SkeletonCard, SkeletonLine } from '@/components/PageSkeleton'

export default function Loading() {
    return (
        <DashboardLayout currentPage="settings">
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <SkeletonLine className="h-7 w-32" />
                    <SkeletonLine className="h-4 w-64 mt-2" />
                </div>
                <SkeletonCard className="h-40" />
                <SkeletonCard className="h-56" />
                <SkeletonCard className="h-72" />
            </div>
        </DashboardLayout>
    )
}
