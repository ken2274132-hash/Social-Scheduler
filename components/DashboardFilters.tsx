'use client'

import { Search, ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'

export default function DashboardFilters() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentSearch = searchParams.get('search') || ''
    const currentSort = searchParams.get('sort') || 'newest'

    const [searchInput, setSearchInput] = useState(currentSearch)

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== currentSearch) {
                const params = new URLSearchParams(searchParams)
                if (searchInput) {
                    params.set('search', searchInput)
                } else {
                    params.delete('search')
                }
                params.set('page', '1') // Reset to page 1 on search
                router.push(`${pathname}?${params.toString()}`)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [searchInput, currentSearch, pathname, router, searchParams])

    const [isOpen, setIsOpen] = useState(false)

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.custom-dropdown')) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSortChange = (newSort: string) => {
        const params = new URLSearchParams(searchParams)
        params.set('sort', newSort)
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
        setIsOpen(false)
    }

    return (
        // No heading here: the dashboard already renders "Recent Activity" in
        // the same header bar this sits in, and a second one fought it.
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
                <label htmlFor="dashboard-search" className="sr-only">
                    Search posts
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                    id="dashboard-search"
                    type="text"
                    placeholder="Search posts..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs w-full sm:w-44 md:w-48 outline-none focus:ring-1 focus:ring-orange-500/30 transition-all font-medium [&::-webkit-search-cancel-button]:appearance-none"
                />
            </div>

            {/* Custom Styled Dropdown */}
            <div className="relative custom-dropdown shrink-0">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-transparent active:scale-95 select-none"
                >
                    <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Sort by:</span>
                    <span className="text-xs text-slate-900 dark:text-slate-200 font-bold capitalize">
                        {currentSort}
                    </span>
                    <ChevronRight size={14} className={`text-gray-400 transition-transform duration-300 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                        {['newest', 'oldest'].map((option) => (
                            <button
                                key={option}
                                onClick={() => handleSortChange(option)}
                                className={`w-full text-left px-4 py-2 text-[12px] font-medium transition-colors hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-slate-800 ${currentSort === option
                                    ? 'text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                <span className="capitalize">{option}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
