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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Posts</h2>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search posts..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-[#F9FBFF] dark:bg-gray-800 border-none rounded-lg text-xs w-full md:w-48 outline-none focus:ring-1 focus:ring-[#5932EA]/30 transition-all font-medium"
                    />
                </div>

                {/* Custom Styled Dropdown */}
                <div className="relative custom-dropdown">
                    <div
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 bg-[#F9FBFF] dark:bg-gray-800 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-transparent active:scale-95 select-none"
                    >
                        <span className="text-[12px] text-[#7E7E7E] font-medium whitespace-nowrap">Short by :</span>
                        <span className="text-[12px] text-[#3D3C3C] dark:text-gray-200 font-bold capitalize">
                            {currentSort}
                        </span>
                        <ChevronRight size={14} className={`text-gray-400 transition-transform duration-300 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
                    </div>

                    {isOpen && (
                        <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                            {['newest', 'oldest'].map((option) => (
                                <button
                                    key={option}
                                    onClick={() => handleSortChange(option)}
                                    className={`w-full text-left px-4 py-2 text-[12px] font-medium transition-colors hover:bg-[#5932EA]/5 hover:text-[#5932EA] dark:hover:bg-gray-800 ${currentSort === option
                                        ? 'text-[#5932EA] bg-[#5932EA]/5 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    <span className="capitalize">{option}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
