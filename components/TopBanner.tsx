'use client'

import { useState } from 'react'
import { Sparkles, X, ArrowRight } from 'lucide-react'

export default function TopBanner() {
    const [isVisible, setIsVisible] = useState(true)

    if (!isVisible) return null

    return (
        <div className="relative z-[100] bg-slate-900 text-white overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 left-1/4 w-1/2 h-full bg-indigo-500/10 blur-[40px] pointer-events-none" />

            <div className="container mx-auto px-4 py-2 relative flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center justify-center gap-3 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                        <Sparkles size={10} className="text-indigo-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Alpha Testing</span>
                    </div>

                    <p className="text-[11px] font-medium tracking-tight whitespace-nowrap">
                        Experience the future of AI social automation.
                        <span className="hidden md:inline ml-1 text-slate-400">Join our early access program and lock in founder pricing.</span>
                    </p>

                    <button className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">
                        Get Started <ArrowRight size={12} />
                    </button>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0 text-slate-500 hover:text-white"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    )
}
