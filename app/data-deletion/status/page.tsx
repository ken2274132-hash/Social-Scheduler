import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

/**
 * Where someone checks that their deletion actually happened.
 *
 * Meta hands the person this link after the callback runs, so it has to work
 * without a login — by this point they have disconnected from us and may have
 * no account left to log in to.
 *
 * The confirmation code is the only thing shown, and it is random rather than
 * guessable, so nothing here identifies a person to whoever holds the link.
 */

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Deletion Status | Feedquill',
    description: 'Check the status of a data deletion request',
}

interface DeletionRecord {
    confirmation_code: string
    status: string
    accounts_removed: number
    posts_removed: number
    completed_at: string | null
}

async function lookup(code: string): Promise<DeletionRecord | null> {
    if (!code) return null

    const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    const { data } = await db
        .from('deletion_requests')
        .select('confirmation_code, status, accounts_removed, posts_removed, completed_at')
        .eq('confirmation_code', code)
        .maybeSingle()

    return (data as DeletionRecord) ?? null
}

export default async function DeletionStatusPage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string }>
}) {
    const { code = '' } = await searchParams
    const record = await lookup(code)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <Link
                    href="/"
                    className="text-orange-700 hover:underline mb-8 inline-block"
                >
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
                    Deletion status
                </h1>

                <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-gray-700 dark:text-gray-300">
                    {!code ? (
                        <p>
                            This page needs a confirmation code. Open the link exactly as it
                            was given to you — it ends in <code>?code=…</code>.
                        </p>
                    ) : !record ? (
                        <>
                            <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                No request found for that code.
                            </p>
                            <p className="text-sm">
                                Check the code for a typo. If it is correct and you still see
                                this, email{' '}
                                <a
                                    href="mailto:rankbyhassan@gmail.com"
                                    className="text-orange-700 hover:underline"
                                >
                                    rankbyhassan@gmail.com
                                </a>{' '}
                                and quote it.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {record.status === 'nothing_to_delete'
                                        ? 'Nothing was held for this account'
                                        : 'Your data has been deleted'}
                                </span>
                            </div>

                            <dl className="space-y-3 text-sm">
                                <div className="flex justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                                    <dt>Confirmation code</dt>
                                    <dd className="font-mono text-gray-900 dark:text-white">
                                        {record.confirmation_code}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                                    <dt>Connected accounts removed</dt>
                                    <dd className="font-mono text-gray-900 dark:text-white">
                                        {record.accounts_removed}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                                    <dt>Posts removed</dt>
                                    <dd className="font-mono text-gray-900 dark:text-white">
                                        {record.posts_removed}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt>Completed</dt>
                                    <dd className="font-mono text-gray-900 dark:text-white">
                                        {record.completed_at
                                            ? new Date(record.completed_at).toLocaleString()
                                            : '—'}
                                    </dd>
                                </div>
                            </dl>

                            <p className="mt-6 text-sm text-gray-500">
                                Access tokens, page details and any posts scheduled or
                                published through those accounts are gone from our database.
                                Posts already live on Facebook or Instagram stay on those
                                platforms — delete those from the platform itself.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
