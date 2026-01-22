'use client'

import { useState } from 'react'
import { Wand2, X, Loader2, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface AIImageStudioProps {
    onSelect: (imageUrl: string) => void
    onClose: () => void
    workspaceId: string
}

export default function AIImageStudio({ onSelect, onClose, workspaceId }: AIImageStudioProps) {
    const [prompt, setPrompt] = useState('')
    const [generating, setGenerating] = useState(false)
    const [resultUrl, setResultUrl] = useState<string | null>(null)
    const [isMock, setIsMock] = useState(false)

    const handleGenerate = async () => {
        if (!prompt.trim()) return
        setGenerating(true)
        try {
            const res = await fetch('/api/ai/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, workspaceId })
            })
            const data = await res.json()
            if (data.imageUrl) {
                setResultUrl(data.imageUrl)
                setIsMock(!!data.isPlaceholder)
            }
        } catch (error) {
            console.error('AI Image generation failed:', error)
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="grid lg:grid-cols-2 gap-10">
                {/* Controls */}
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                            Describe Your Vision
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="A professional flat-lay photograph of tech accessories on a dark wooden desk, moody lighting, high contrast..."
                            rows={5}
                            className="w-full px-6 py-5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all resize-none"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={generating || !prompt.trim()}
                        className="w-full relative group overflow-hidden bg-purple-600 text-white p-6 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl shadow-purple-500/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center justify-center gap-3">
                            {generating ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                            <span>{generating ? 'Dreaming...' : 'Generate Magic'}</span>
                        </div>
                    </button>

                    <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-3xl border border-purple-100/50 dark:border-purple-900/20">
                        <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Sparkles size={12} />
                            Pro Tip
                        </h5>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 leading-relaxed uppercase tracking-tight">
                            Be specific about lighting, style, and composition for the best results. The more detail, the more stunning the asset.
                        </p>
                    </div>
                </div>

                {/* Preview */}
                <div className="relative aspect-square bg-gray-50 dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col items-center justify-center group/preview">
                    {resultUrl ? (
                        <>
                            {isMock && (
                                <div className="absolute top-6 left-6 right-6 p-4 bg-orange-500/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle size={18} className="text-white shrink-0" />
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">
                                            Demo Mode: Add OPENAI_API_KEY to .env.local for real results
                                        </p>
                                    </div>
                                </div>
                            )}
                            <Image
                                src={resultUrl}
                                alt="AI Generation"
                                fill
                                className="object-cover animate-in fade-in zoom-in-95 duration-700"
                                unoptimized
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity backdrop-blur-sm flex items-center justify-center flex-col gap-4">
                                <button
                                    onClick={() => onSelect(resultUrl)}
                                    className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-110 active:scale-95 transition-all shadow-2xl"
                                >
                                    Use This Asset
                                </button>
                                <button
                                    onClick={() => setResultUrl(null)}
                                    className="text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-pulse">
                            <ImageIcon size={64} className="text-gray-200 dark:text-gray-800" />
                            <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest text-center px-10">
                                {generating ? 'Asset is being synthesized in the cloud...' : 'Generation preview will appear here'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
