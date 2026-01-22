'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Upload, X, Loader2, Sparkles, Calendar, Send, Heart, MessageCircle, Bookmark, Instagram, AlertCircle, Trash2, Image as ImageIcon, Wand2, Plus } from 'lucide-react'
import AIImageStudio from './AIImageStudio'

type SocialAccount = {
    id: string
    platform: string
    account_name: string | null
}

type AIGeneration = {
    hooks: string[]
    captions: {
        short: string
        medium: string
        long: string
    }
    hashtags: string[]
}

export default function ComposerForm({
    workspaceId,
    socialAccounts,
    initialPost
}: {
    workspaceId: string
    socialAccounts: SocialAccount[]
    initialPost?: any
}) {
    const [userInput, setUserInput] = useState<string>(initialPost?.caption || '')
    const [aiGeneration, setAiGeneration] = useState<AIGeneration | null>(null)
    const [selectedHook, setSelectedHook] = useState<string>('')
    const [selectedCaption, setSelectedCaption] = useState<string>('')
    const [caption, setCaption] = useState<string>(initialPost?.caption || '')
    const [selectedAccount, setSelectedAccount] = useState<string>(
        initialPost?.social_account_id || socialAccounts[0]?.id || ''
    )
    const [scheduledDate, setScheduledDate] = useState<string>(
        initialPost?.scheduled_at ? new Date(initialPost.scheduled_at).toISOString().split('T')[0] : ''
    )
    const [scheduledTime, setScheduledTime] = useState<string>(
        initialPost?.scheduled_at ? new Date(initialPost.scheduled_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''
    )
    const [loading, setLoading] = useState<boolean>(false)
    const [uploading, setUploading] = useState<boolean>(false)
    const [step, setStep] = useState<number>(initialPost ? 2 : 1)
    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [mediaPreview, setMediaPreview] = useState<string | null>(initialPost?.media_assets?.url || null)
    const [mediaId, setMediaId] = useState<string | null>(initialPost?.media_id || null)
    const [showAIStudio, setShowAIStudio] = useState<boolean>(false)
    const searchParams = useSearchParams()

    useEffect(() => {
        const dateParam = searchParams.get('date')
        if (dateParam) {
            setScheduledDate(dateParam)
        }
    }, [searchParams])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setMediaFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setMediaPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
        setMediaId(null)
    }

    const uploadMedia = async (file: File) => {
        setUploading(true)
        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${workspaceId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath)

            const { data: asset, error: assetError } = await supabase
                .from('media_assets')
                .insert({
                    workspace_id: workspaceId,
                    storage_path: filePath,
                    url: publicUrl,
                    type: file.type.startsWith('video') ? 'video' : 'image',
                })
                .select()
                .single()

            if (assetError) throw assetError
            setMediaId(asset.id)
            return asset.id
        } catch (error: any) {
            console.error('Upload error:', error)
            alert('Failed to upload media: ' + error.message)
            return null
        } finally {
            setUploading(false)
        }
    }

    const handleSelectAIImage = (imageUrl: string) => {
        setMediaPreview(imageUrl)
        setMediaFile(null)
        setMediaId(null)
        setShowAIStudio(false)
    }

    const handleUserInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setUserInput(e.target.value)
        if (e.target.value.trim() !== '') {
            setStep(2)
        } else {
            setStep(1)
            setAiGeneration(null)
        }
    }

    const handleGenerateAI = async () => {
        if (!userInput.trim()) {
            alert('Please enter some content first')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userInput,
                    workspaceId,
                }),
            })

            const data = await response.json()
            setAiGeneration(data.generation)
            setSelectedHook(data.generation.hooks[0])
            setSelectedCaption(data.generation.captions.medium)
            setCaption(data.generation.hooks[0] + '\n\n' + data.generation.captions.medium + '\n\n' + data.generation.hashtags.join(' '))
            setStep(2)
        } catch (error) {
            alert('Failed to generate AI content')
        } finally {
            setLoading(false)
        }
    }

    const handlePublishNow = async () => {
        if (!mediaPreview && !mediaId) {
            alert('Please upload an image or video first')
            return
        }

        if (!confirm('Are you sure you want to publish this post right now?')) {
            return
        }

        setLoading(true)
        try {
            let currentMediaId = mediaId
            if (!currentMediaId && mediaFile) {
                currentMediaId = await uploadMedia(mediaFile)
            }

            // Handle AI generated image (it's a URL, not a file)
            if (!currentMediaId && mediaPreview?.startsWith('http') && !mediaFile) {
                // In production, we'd transfer the AI image to Supabase Bucket
                // For now, let's create a placeholder asset entry
                const supabase = createClient()
                const { data: asset, error: assetError } = await supabase
                    .from('media_assets')
                    .insert({
                        workspace_id: workspaceId,
                        url: mediaPreview,
                        type: 'image',
                        storage_path: 'ai-generated/' + Math.random().toString(36).substring(7)
                    })
                    .select()
                    .single()

                if (assetError) throw assetError
                currentMediaId = asset.id
            }

            if (!currentMediaId) throw new Error('Media asset not ready')

            const scheduleResponse = await fetch('/api/posts/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    socialAccountId: selectedAccount,
                    caption,
                    scheduledAt: new Date().toISOString(),
                    mediaId: currentMediaId,
                }),
            })

            const scheduleData = await scheduleResponse.json()
            if (!scheduleResponse.ok) throw new Error(scheduleData.error || 'Failed to initialize post')

            const publishResponse = await fetch('/api/posts/publish-now', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: scheduleData.post.id,
                    workspaceId,
                }),
            })

            const publishData = await publishResponse.json()
            if (publishResponse.ok) {
                alert('Post published successfully!')
                window.location.href = '/dashboard'
            } else {
                throw new Error(publishData.error || 'Failed to publish post')
            }
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSchedulePost = async () => {
        if (!scheduledDate || !scheduledTime) {
            alert('Please select date and time')
            return
        }

        if (!mediaPreview && !mediaId) {
            alert('Please upload/generate media first')
            return
        }

        setLoading(true)
        try {
            let currentMediaId = mediaId
            if (!currentMediaId && mediaFile) {
                currentMediaId = await uploadMedia(mediaFile)
            }

            // Handle AI generated image
            if (!currentMediaId && mediaPreview?.startsWith('http') && !mediaFile) {
                const supabase = createClient()
                const { data: asset, error: assetError } = await supabase
                    .from('media_assets')
                    .insert({
                        workspace_id: workspaceId,
                        url: mediaPreview,
                        type: 'image',
                        storage_path: 'ai-generated/' + Math.random().toString(36).substring(7)
                    })
                    .select()
                    .single()

                if (assetError) throw assetError
                currentMediaId = asset.id
            }

            if (!currentMediaId) throw new Error('Media preparation failed')

            const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)

            const response = await fetch('/api/posts/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    socialAccountId: selectedAccount,
                    caption,
                    scheduledAt: scheduledAt.toISOString(),
                    mediaId: currentMediaId,
                }),
            })

            if (response.ok) {
                alert('Post scheduled successfully!')
                window.location.href = '/calendar'
            } else {
                const data = await response.json()
                throw new Error(data.error || 'Failed to schedule post')
            }
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid lg:grid-cols-3 gap-10 items-start pb-20">
            {/* Left: Content Input & Media */}
            <div className="lg:col-span-1 space-y-8">
                <div className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.08] transition-transform duration-700 group-hover:scale-110 -rotate-12 translate-x-4 -translate-y-4">
                        <Upload size={120} />
                    </div>

                    <header className="relative mb-8">
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                            Media & Intent
                        </h2>
                    </header>

                    <div className="space-y-8 relative z-10">
                        {/* Media Upload */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                                Visual Asset
                            </label>
                            {mediaPreview ? (
                                <div className="group relative">
                                    <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-gray-100 dark:border-gray-900 group/media shadow-xl">
                                        <Image
                                            src={mediaPreview}
                                            alt="Preview"
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover/media:scale-110"
                                            unoptimized
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <button
                                                onClick={() => {
                                                    setMediaFile(null)
                                                    setMediaPreview(null)
                                                    setMediaId(null)
                                                }}
                                                className="p-3 bg-red-600 text-white rounded-2xl shadow-lg hover:bg-red-700 hover:scale-110 transition-all font-bold flex items-center gap-2"
                                            >
                                                <Trash2 size={20} />
                                                <span>Remove</span>
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAIStudio(true)}
                                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl border border-white/20 hover:scale-105 transition-transform flex items-center gap-2 z-20"
                                    >
                                        <Wand2 size={12} />
                                        <span>Regenerate with AI</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 h-64">
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group/upload bg-gray-50/50 dark:bg-gray-900/30">
                                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg shadow-blue-500/20">
                                            <Upload size={20} />
                                        </div>
                                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">Upload</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*,video/*"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                    <button
                                        onClick={() => setShowAIStudio(true)}
                                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group/ai bg-gray-50/50 dark:bg-gray-900/30"
                                    >
                                        <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg shadow-purple-500/20">
                                            <Wand2 size={20} />
                                        </div>
                                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">AI Studio</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                                Post Topic
                            </label>
                            <textarea
                                value={userInput}
                                onChange={handleUserInput}
                                rows={4}
                                placeholder="Describe your post idea here..."
                                className="w-full px-6 py-5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl text-gray-900 dark:text-white resize-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-gray-400"
                            />
                        </div>

                        <button
                            onClick={handleGenerateAI}
                            disabled={loading || !userInput.trim() || !mediaPreview}
                            className="w-full relative group overflow-hidden bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-5 rounded-3xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative flex items-center justify-center gap-3">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                <span>{loading ? 'AI Thinking...' : 'Brainstorm with AI'}</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Middle: AI Content & Scheduling */}
            <div className="lg:col-span-1 space-y-8">
                {(aiGeneration || initialPost) && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                        {/* AI Generated Content */}
                        <div className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm">
                            <header className="relative mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-600 rounded-full shadow-[0_0_12px_rgba(147,51,234,0.6)]" />
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                        Content
                                    </h2>
                                </div>
                                <Sparkles size={24} className="text-purple-600 animate-pulse" />
                            </header>

                            <div className="space-y-6">
                                {aiGeneration && (
                                    <>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                                                Select Hook
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={selectedHook}
                                                    onChange={(e) => {
                                                        setSelectedHook(e.target.value)
                                                        if (aiGeneration) {
                                                            setCaption(e.target.value + '\n\n' + selectedCaption + '\n\n' + aiGeneration.hashtags.join(' '))
                                                        }
                                                    }}
                                                    className="w-full appearance-none px-6 py-4 bg-gray-100 dark:bg-gray-900/50 border border-transparent focus:border-purple-500 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none transition-all cursor-pointer"
                                                >
                                                    {aiGeneration.hooks.map((hook, i) => (
                                                        <option key={i} value={hook}>Hook Option {i + 1}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <Sparkles size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                                                Caption Style
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['short', 'medium', 'long'] as const).map((length) => (
                                                    <button
                                                        key={length}
                                                        onClick={() => {
                                                            if (aiGeneration) {
                                                                setSelectedCaption(aiGeneration.captions[length])
                                                                setCaption(selectedHook + '\n\n' + aiGeneration.captions[length] + '\n\n' + aiGeneration.hashtags.join(' '))
                                                            }
                                                        }}
                                                        className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aiGeneration && selectedCaption === aiGeneration.captions[length]
                                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                                                            : 'bg-gray-100/50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                                                            }`}
                                                    >
                                                        {length}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                                        Final Caption
                                    </label>
                                    <textarea
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        rows={6}
                                        className="w-full px-6 py-5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl text-sm font-medium text-gray-900 dark:text-white resize-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scheduling */}
                        <div className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm">
                            <header className="relative mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-600 rounded-full shadow-[0_0_12px_rgba(234,88,12,0.6)]" />
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                        Schedule
                                    </h2>
                                </div>
                                <Calendar size={24} className="text-orange-600" />
                            </header>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                                        Channel
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {socialAccounts.map((account) => (
                                            <button
                                                key={account.id}
                                                onClick={() => setSelectedAccount(account.id)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedAccount === account.id
                                                    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-500 text-orange-600 dark:text-orange-400'
                                                    : 'bg-gray-50 dark:bg-gray-900/50 border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${account.platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                        <Instagram size={14} />
                                                    </div>
                                                    <span className="text-sm font-bold">{account.account_name}</span>
                                                </div>
                                                {selectedAccount === account.id && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-4 bg-gray-100 dark:bg-gray-900/50 border border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            className="w-full px-4 py-4 bg-gray-100 dark:bg-gray-900/50 border border-transparent focus:border-orange-500 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div className="flex gap-3">
                                        {initialPost && (
                                            <button
                                                onClick={handlePublishNow}
                                                disabled={loading}
                                                className="flex-1 group flex items-center justify-center gap-2 py-5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-3xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all font-black uppercase tracking-widest text-[10px] active:scale-95"
                                            >
                                                <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
                                                <span>Delete</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handlePublishNow}
                                            disabled={loading}
                                            className="flex-1 group flex items-center justify-center gap-2 py-5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-3xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-black uppercase tracking-widest text-[10px] active:scale-95"
                                        >
                                            <Send size={18} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                            <span>Publish</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleSchedulePost}
                                        disabled={loading || !scheduledDate || !scheduledTime}
                                        className="w-full group flex items-center justify-center gap-3 py-5 bg-orange-600 text-white rounded-3xl hover:bg-orange-700 shadow-lg shadow-orange-500/20 transition-all font-black uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
                                    >
                                        <Calendar size={18} className="group-hover:scale-110 transition-transform" />
                                        <span>{loading ? 'Processing...' : (initialPost ? 'Update Schedule' : 'Confirm Schedule')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Instagram Preview (Sticky) */}
            <div className="lg:col-span-1">
                <div className="sticky top-28 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            Live Preview
                        </label>
                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            Active Rendering
                        </div>
                    </div>

                    <div className="bg-white dark:bg-black rounded-[2.5rem] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl shadow-black/10 max-w-[400px] mx-auto scale-95 origin-top transition-transform hover:scale-100 duration-700">
                        {/* IG Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-900">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-white dark:bg-black border-2 border-black flex items-center justify-center overflow-hidden">
                                        <div className="bg-gray-200 dark:bg-gray-800 w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500 uppercase">
                                            {socialAccounts.find(a => a.id === selectedAccount)?.account_name?.slice(0, 2) || 'YG'}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-gray-900 dark:text-gray-100">
                                        {socialAccounts.find(a => a.id === selectedAccount)?.account_name || 'your_handle'}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium leading-none">Original Audio</div>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
                                <span className="flex gap-0.5">
                                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                                </span>
                            </button>
                        </div>

                        {/* IG Media */}
                        <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative group min-h-[300px]">
                            {mediaPreview ? (
                                <Image
                                    src={mediaPreview}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="text-gray-400 text-sm flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-3xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                        <Instagram size={32} className="opacity-20" />
                                    </div>
                                    <span className="font-bold uppercase tracking-widest text-[10px]">Awaiting Media</span>
                                </div>
                            )}
                        </div>

                        {/* IG Actions */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-4">
                                    <Heart size={24} className="hover:scale-110 transition-transform cursor-pointer" />
                                    <MessageCircle size={24} className="hover:scale-110 transition-transform cursor-pointer" />
                                    <Send size={24} className="hover:scale-110 -rotate-12 transition-transform cursor-pointer" />
                                </div>
                                <Bookmark size={24} className="hover:scale-110 transition-transform cursor-pointer" />
                            </div>

                            {/* IG Caption */}
                            <div className="space-y-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-black">
                                        {socialAccounts.find(a => a.id === selectedAccount)?.account_name?.toLowerCase().replace(/\s+/g, '_') || 'your_handle'}
                                    </span>
                                    <p className="text-xs text-gray-900 dark:text-gray-100 leading-relaxed">
                                        {caption ? (
                                            <span className="whitespace-pre-wrap">{caption}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">Content strategy will manifest here...</span>
                                        )}
                                    </p>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-6 py-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-900/20 text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>Preview is optimized for Instagram mobile view. Actual appearance may vary slightly.</span>
                    </div>
                </div>
            </div>

            {/* AI Image Studio Modal */}
            {showAIStudio && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAIStudio(false)} />
                    <div className="relative w-full max-w-4xl bg-white dark:bg-gray-950 rounded-[3.5rem] border border-white/20 dark:border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <header className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                        <Sparkles size={24} />
                                    </div>
                                    AI Image Studio
                                </h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Generate premium visual assets in seconds</p>
                            </div>
                            <button
                                onClick={() => setShowAIStudio(false)}
                                className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-[1.5rem] transition-all"
                            >
                                <X size={24} />
                            </button>
                        </header>

                        <div className="p-10">
                            <AIImageStudio
                                workspaceId={workspaceId}
                                onSelect={handleSelectAIImage}
                                onClose={() => setShowAIStudio(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
