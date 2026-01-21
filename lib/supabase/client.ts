import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Build-time safety: If env vars are missing, return a dummy object
    // that won't crash the @supabase/ssr initialization validation.
    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            auth: { getSession: async () => ({ data: { session: null }, error: null }) },
            from: () => ({ select: () => ({ order: () => ({ single: () => ({}) }) }) })
        } as any
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
