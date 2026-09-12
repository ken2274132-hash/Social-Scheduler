import DashboardLayout from '@/components/DashboardLayout'
import { SkeletonHeader, SkeletonStats, SkeletonList } from '@/components/PageSkeleton'

export default function Loading() {
    return (
        <DashboardLayout currentPage="dashboard">
            <div className="space-y-8">
                <SkeletonHeader />
                <SkeletonStats />
                <SkeletonList rows={4} />
            </div>
        </DashboardLayout>
    )
}
