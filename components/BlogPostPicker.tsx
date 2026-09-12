'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { X, Globe, AlertCircle, Loader2 } from 'lucide-react'

export type BlogPost = {
    id: string
    title: string
    excerpt: string
    url: string
    date: string
    image: string | null
}

/**
 * Turn a blog post into a social caption: the headline leads, the excerpt gives
 * the hook, and the link sends people to the article. Same shape the workflow
 * builder produces, so a post reads identically whichever way it was added.
 */
export function blogPostToCaption(post: BlogPost): string {
    const hook =
        post.excerpt.length > 180 ? `${post.excerpt.slice(0, 180).trimEnd()}…` : post.excerpt

    return [post.title, hook, `Read more: ${post.url}`].filter(Boolean).join('\n\n')
}

/**
 * Picks one post off the connected WordPress blog.
 *
 * The blog is a content SOURCE — this reads from it. Nothing here writes back
 * to the user's site.
 */
export default function BlogPostPicker({
    open,
    onClose,
    onSelect,
}: {
    open: boolean
    onClose: () => void
    onSelect: (post: BlogPost) => void
}) {
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [siteName, setSiteName] = useState<string>('')
    const [connected, setConnected] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/wordpress/posts')
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || `Blog request failed (${res.status})`)

            setConnected(Boolean(data.connected))
            setSiteName(data.siteName || '')
            setPosts(Array.isArray(data.posts) ? data.posts : [])
        } catch (err: any) {
            // Without this the modal would just sit empty and the user would
            // conclude the blog has no posts.
            setError(err?.message || 'Could not reach your blog')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (open) load()
    }, [open, load])

    // Escape closes, like every other dismissible surface should.
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Import a blog post"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#21759B]/10 flex items-center justify-center shrink-0">
                            <Globe className="w-4 h-4 text-[#21759B]" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                Import from blog
                            </h3>
                            <p className="text-xs text-slate-500 truncate">
                                {siteName || 'Your connected WordPress site'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                            <Loader2 size={16} className="animate-spin" />
                            Loading your posts…
                        </div>
                    )}

                    {!loading && error && (
                        <div className="text-center py-12 px-4">
                            <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                Couldn&apos;t load your blog posts
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{error}</p>
                            <button
                                onClick={load}
                                className="mt-4 px-4 py-2 text-sm font-medium bg-orange-700 hover:bg-orange-800 text-white rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && connected === false && (
                        <div className="text-center py-12 px-4">
                            <Globe className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                No blog connected
                            </p>
                            <p className="text-xs text-slate-500 mt-1 mb-4">
                                Connect your WordPress site to turn its posts into social posts.
                            </p>
                            <a
                                href="/settings"
                                className="inline-block px-4 py-2 text-sm font-medium bg-orange-700 hover:bg-orange-800 text-white rounded-lg transition-colors"
                            >
                                Go to Settings
                            </a>
                        </div>
                    )}

                    {!loading && !error && connected && posts.length === 0 && (
                        <div className="text-center py-12 px-4">
                            <p className="text-sm text-slate-500">
                                No published posts found on your blog yet.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        {!loading &&
                            !error &&
                            posts.map((post) => (
                                <button
                                    key={post.id}
                                    onClick={() => onSelect(post)}
                                    className="w-full flex items-start gap-3 p-3 text-left rounded-xl border border-slate-100 dark:border-slate-800 hover:border-orange-500/50 hover:bg-orange-50/40 dark:hover:bg-orange-950/10 transition-colors"
                                >
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                        {post.image ? (
                                            <Image
                                                src={post.image}
                                                alt=""
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Globe size={18} className="text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                                            {post.title}
                                        </p>
                                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                            {post.excerpt}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            {new Date(post.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
