import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getAuthContext } from '@/lib/auth'

/**
 * Cached workspace fetch - deduplicated across components in a single request.
 * React `cache()` ensures this only runs once per server request.
 *
 * Under the development auth bypass (see lib/auth.ts) this resolves to the
 * configured dev user without a session, so pages render without signing in.
 */
export const getWorkspace = cache(async () => {
    const ctx = await getAuthContext()

    if (!ctx) {
        redirect('/login')
    }

    const { user, db } = ctx

    const { data: workspaces } = await db
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

    let workspace = workspaces?.[0]

    if (!workspace) {
        const { data: newWorkspace } = await db
            .from('workspaces')
            .insert({
                name: 'Default Workspace',
                owner_id: user.id
            })
            .select()
            .single()
        workspace = newWorkspace
    }

    return { user, workspace, supabase: db }
})
