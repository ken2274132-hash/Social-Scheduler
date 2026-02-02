import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

/**
 * Cached workspace fetch - deduplicated across components in a single request.
 * React `cache()` ensures this only runs once per server request.
 */
export const getWorkspace = cache(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    let { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

    let workspace = workspaces?.[0]

    if (!workspace) {
        const { data: newWorkspace } = await supabase
            .from('workspaces')
            .insert({
                name: 'Default Workspace',
                owner_id: user.id
            })
            .select()
            .single()
        workspace = newWorkspace
    }

    return { user, workspace, supabase }
})
