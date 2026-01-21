import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()

        // Verify session and super_admin role
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (adminUser?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { userId, postLimit, status, role } = body

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const updateData: any = {}
        if (typeof postLimit === 'number') updateData.post_limit = postLimit
        if (status) updateData.status = status
        if (role) updateData.role = role

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
