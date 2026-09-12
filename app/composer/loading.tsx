import DashboardLayout from '@/components/DashboardLayout'
import { SkeletonCard, SkeletonLine } from '@/components/PageSkeleton'

export default function Loading() {
    return (
        <DashboardLayout currentPage="composer">
            <div className="max-w-6xl mx-auto">
                <SkeletonLine className="h-7 w-40 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SkeletonCard className="lg:col-span-2 p-6 h-96" />
                    <SkeletonCard className="p-6 h-96" />
                </div>
            </div>
        </DashboardLayout>
    )
}
