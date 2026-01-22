'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function LoadingBar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        // Reset on route change complete
        setLoading(false)
        setProgress(100)
        const timer = setTimeout(() => setProgress(0), 200)
        return () => clearTimeout(timer)
    }, [pathname, searchParams])

    useEffect(() => {
        const handleStart = () => {
            setLoading(true)
            setProgress(30)
        }

        // Listen for link clicks to show loading immediately
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const link = target.closest('a')
            if (link && link.href && !link.href.startsWith('#') && link.href.includes(window.location.origin)) {
                if (!link.target || link.target === '_self') {
                    handleStart()
                    // Animate progress
                    const interval = setInterval(() => {
                        setProgress(prev => {
                            if (prev >= 90) {
                                clearInterval(interval)
                                return 90
                            }
                            return prev + 20
                        })
                    }, 100)
                }
            }
        }

        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    if (progress === 0) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent">
            <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out shadow-lg shadow-blue-500/50"
                style={{ width: `${progress}%` }}
            />
        </div>
    )
}
