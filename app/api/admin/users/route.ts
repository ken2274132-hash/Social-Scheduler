import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse, clientError } from '@/lib/api'

const ALLOWED_STATUSES = ['active', 'banned', 'suspended']
const ALLOWED_ROLES = ['user', 'super_admin']

export async function PATCH(request: Request) {
    try {
        // getUser() revalidates the JWT. getSession() only decodes the cookie,
        // which is not safe to base an admin check on.
        const { user, db } = await requireAuth()

        const { data: adminUser } = await db
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (adminUser?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { userId, postLimit, status, role } = body

        if (!userId) {
            return clientError('User ID is required', 400)
        }

        const updateData: Record<string, unknown> = {}

        if (typeof postLimit === 'number') {
            if (!Number.isInteger(postLimit) || postLimit < 0) {
                return clientError('Post limit must be a whole number of 0 or more.', 400)
            }
            updateData.post_limit = postLimit
        }

        if (status !== undefined) {
            if (!ALLOWED_STATUSES.includes(status)) {
                return clientError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400)
            }
            updateData.status = status
        }

        if (role !== undefined) {
            if (!ALLOWED_ROLES.includes(role)) {
                return clientError(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400)
            }
            // Losing the last super admin would lock everyone out of /admin.
            if (userId === user.id && role !== 'super_admin') {
                return clientError('You cannot remove your own admin role.', 400)
            }
            updateData.role = role
        }

        if (Object.keys(updateData).length === 0) {
            return clientError('Nothing to update.', 400)
        }

        const { error } = await db
            .from('users')
            .update(updateData)
            .eq('id', userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return errorResponse(error, 'admin/users')
    }
}
