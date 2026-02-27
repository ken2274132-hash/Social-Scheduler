'use client'

import { useState, useRef } from 'react'
import { Wand2, Loader2, Image as ImageIcon, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'

interface AIImageStudioProps {
    onSelect: (imageUrl: string) => void
    onClose: () => void
    workspaceId: string
}

export default function AIImageStudio({ onSelect, onClose, workspaceId }: AIImageStudioProps) {
    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)
    const [resultUrl, setResultUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [imageReady, setImageReady] = useState(false)
    const [provider, setProvider] = useState<string | null>(null)
    const retryCount = useRef(0)
    const maxRetries = 3

    const handleGenerate = async () => {
        if (!prompt.trim()) return
        setLoading(true)
        setError(null)
        setResultUrl(null)
        setImageReady(false)
        setProvider(null)
        retryCount.current = 0

        try {
            const res = await fetch('/api/ai/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, workspaceId })
            })
            const data = await res.json()

            if (data.error) {
                setError(data.error)
                setLoading(false)
                return
            }

            if (data.imageUrl) {
                console.log('Got image data URL (base64), provider:', data.provider)
                // Image is already fetched by the server as base64
                setResultUrl(data.imageUrl)
                setProvider(data.provider || 'ai')
                setImageReady(true)
                setLoading(false)
            } else {
                setError('No image received')
                setLoading(false)
            }
        } catch (err) {
            console.error('AI Image generation failed:', err)
            setError('Failed to generate image. Please try again.')
            setLoading(false)
        }
    }

    const handleImageLoad = () => {
        console.log('Image element loaded!')
        setImageReady(true)
        setLoading(false)
        retryCount.current = 0
    }

    const handleImageError = () => {
        retryCount.current++
        console.log(`Image failed to load, attempt ${retryCount.current}/${maxRetries}`)

        if (retryCount.current < maxRetries && resultUrl) {
            // Retry with a new seed after a delay
            setTimeout(() => {
                const newUrl = resultUrl.replace(/seed=\d+/, `seed=${Math.floor(Math.random() * 1000000)}`)
                console.log('Retrying with new URL:', newUrl)
                setResultUrl(newUrl)
            }, 2000)
        } else {
            setError('Image generation failed. The AI service may be busy. Please try again.')
            setResultUrl(null)
            setLoading(false)
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
                            placeholder="A horse running in a green meadow, sunset, golden hour lighting..."
                            rows={4}
                            className="w-full px-5 py-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim()}
                        className="w-full relative group overflow-hidden bg-purple-600 text-white p-5 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all hover:bg-purple-700 active:scale-98 disabled:opacity-50 shadow-lg"
                    >
                        <div className="flex items-center justify-center gap-3">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                            <span>{loading ? 'Generating... (10-30s)' : 'Generate Image'}</span>
                        </div>
                    </button>

                    <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100/50 dark:border-purple-900/20">
                        <h5 className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Sparkles size={12} />
                            Tips
                        </h5>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                            Use descriptive words like: "professional photo", "high quality", "detailed", "realistic"
                        </p>
                    </div>
                </div>

                {/* Preview */}
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col items-center justify-center">
                    {error ? (
                        <div className="flex flex-col items-center gap-4 px-6 text-center">
                            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                                <AlertCircle size={28} className="text-red-500" />
                            </div>
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                            <button
                                onClick={() => { setError(null); handleGenerate(); }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
                            >
                                <RefreshCw size={14} />
                                Try Again
                            </button>
                        </div>
                    ) : loading && !resultUrl ? (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 size={40} className="animate-spin text-purple-500" />
                            <p className="text-xs font-medium text-gray-400 text-center px-8">
                                AI is creating your image...
                                <br />
                                <span className="text-gray-300">(This takes 10-30 seconds)</span>
                            </p>
                        </div>
                    ) : resultUrl ? (
                        <>
                            {/* Hidden img to preload */}
                            <img
                                src={resultUrl}
                                alt="AI Generated"
                                onLoad={handleImageLoad}
                                onError={handleImageError}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imageReady ? 'opacity-100' : 'opacity-0'}`}
                            />

                            {/* Loading overlay while image loads */}
                            {!imageReady && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
                                    <Loader2 size={40} className="animate-spin text-purple-500" />
                                    <p className="text-xs text-gray-400 mt-4">Loading image...</p>
                                </div>
                            )}

                            {/* Provider badge */}
                            {imageReady && provider === 'picsum' && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500/90 text-white text-[10px] font-semibold rounded-lg">
                                    Stock Photo (AI unavailable)
                                </div>
                            )}
                            {imageReady && provider === 'huggingface' && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500/90 text-white text-[10px] font-semibold rounded-lg">
                                    AI Generated (Stable Diffusion)
                                </div>
                            )}

                            {/* Hover overlay */}
                            {imageReady && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-3">
                                    <button
                                        onClick={() => onSelect(resultUrl)}
                                        className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold uppercase tracking-wider text-xs hover:scale-105 transition-transform shadow-xl"
                                    >
                                        Use This Image
                                    </button>
                                    <button
                                        onClick={() => { setResultUrl(null); setImageReady(false); setProvider(null); }}
                                        className="text-white/70 hover:text-white text-xs font-medium"
                                    >
                                        Generate New
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <ImageIcon size={48} className="text-gray-300 dark:text-gray-700" />
                            <p className="text-xs font-medium text-gray-400 text-center">
                                Your AI-generated image<br />will appear here
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
