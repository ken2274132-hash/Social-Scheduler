'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Upload, X, Loader2, Sparkles, Calendar, Send, Heart, MessageCircle, Bookmark, AlertCircle, Trash2, Wand2, Clock, ChevronDown } from 'lucide-react'
import AIImageStudio from './AIImageStudio'
import { toast } from 'sonner'

// Platform config with emojis
const platformConfig: Record<string, { bg: string; icon: string }> = {
    instagram: { bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', icon: '📸' },
    facebook: { bg: 'bg-blue-600', icon: '👤' },
    pinterest: { bg: 'bg-red-600', icon: '📌' },
    twitter: { bg: 'bg-sky-500', icon: '🐦' },
}

type SocialAccount = { id: string; platform: string; account_name: string | null }
type AIGeneration = { hooks: string[]; captions: { short: string; medium: string; long: string }; hashtags: string[] }

export default function ComposerForm({ workspaceId, socialAccounts, initialPost }: { workspaceId: string; socialAccounts: SocialAccount[]; initialPost?: any }) {
    const [userInput, setUserInput] = useState<string>(initialPost?.caption || '')
    const [aiGeneration, setAiGeneration] = useState<AIGeneration | null>(null)
    const [selectedHook, setSelectedHook] = useState<string>('')
    const [selectedCaption, setSelectedCaption] = useState<string>('')
    const [caption, setCaption] = useState<string>(initialPost?.caption || '')
    const [selectedAccount, setSelectedAccount] = useState<string>(initialPost?.social_account_id || socialAccounts[0]?.id || '')
    const [scheduledDate, setScheduledDate] = useState<string>(initialPost?.scheduled_at ? new Date(initialPost.scheduled_at).toISOString().split('T')[0] : '')
    const [scheduledTime, setScheduledTime] = useState<string>(initialPost?.scheduled_at ? new Date(initialPost.scheduled_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '')
    const [loading, setLoading] = useState<boolean>(false)
    const [uploading, setUploading] = useState<boolean>(false)
    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [mediaPreview, setMediaPreview] = useState<string | null>(initialPost?.media_assets?.url || null)
    const [mediaId, setMediaId] = useState<string | null>(initialPost?.media_id || null)
    const [showAIStudio, setShowAIStudio] = useState<boolean>(false)
    const searchParams = useSearchParams()

    useEffect(() => {
        const dateParam = searchParams.get('date')
        if (dateParam) setScheduledDate(dateParam)
    }, [searchParams])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setMediaFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setMediaPreview(reader.result as string)
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
            const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file)
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath)
            const { data: asset, error: assetError } = await supabase.from('media_assets').insert({ workspace_id: workspaceId, storage_path: filePath, url: publicUrl, type: file.type.startsWith('video') ? 'video' : 'image' }).select().single()
            if (assetError) throw assetError
            setMediaId(asset.id)
            return asset.id
        } catch (error: any) {
            toast.error('Failed to upload media: ' + error.message)
            return null
        } finally { setUploading(false) }
    }

    const handleSelectAIImage = (imageUrl: string) => { setMediaPreview(imageUrl); setMediaFile(null); setMediaId(null); setShowAIStudio(false) }

    const handleGenerateAI = async () => {
        if (!userInput.trim()) { toast.error('Please enter some content first'); return }
        setLoading(true)
        try {
            const response = await fetch('/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userInput, workspaceId }) })
            const data = await response.json()
            setAiGeneration(data.generation)
            setSelectedHook(data.generation.hooks[0])
            setSelectedCaption(data.generation.captions.medium)
            setCaption(data.generation.hooks[0] + '\n\n' + data.generation.captions.medium + '\n\n' + data.generation.hashtags.join(' '))
        } catch { toast.error('Failed to generate AI content') }
        finally { setLoading(false) }
    }

    const handlePublishNow = async () => {
        if (!mediaPreview && !mediaId) { toast.error('Please upload an image or video first'); return }
        setLoading(true)
        try {
            let currentMediaId = mediaId
            if (!currentMediaId && mediaFile) currentMediaId = await uploadMedia(mediaFile)
            if (!currentMediaId && mediaPreview?.startsWith('http') && !mediaFile) {
                const supabase = createClient()
                const { data: asset, error: assetError } = await supabase.from('media_assets').insert({ workspace_id: workspaceId, url: mediaPreview, type: 'image', storage_path: 'ai-generated/' + Math.random().toString(36).substring(7) }).select().single()
                if (assetError) throw assetError
                currentMediaId = asset.id
            }
            if (!currentMediaId) throw new Error('Media asset not ready')
            const scheduleResponse = await fetch('/api/posts/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, socialAccountId: selectedAccount, caption, scheduledAt: new Date().toISOString(), mediaId: currentMediaId }) })
            const scheduleData = await scheduleResponse.json()
            if (!scheduleResponse.ok) throw new Error(scheduleData.error || 'Failed to initialize post')
            const publishResponse = await fetch('/api/posts/publish-now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: scheduleData.post.id, workspaceId }) })
            const publishData = await publishResponse.json()
            if (publishResponse.ok) { toast.success('Post published successfully!'); window.location.href = '/dashboard' }
            else throw new Error(publishData.error || 'Failed to publish post')
        } catch (error: any) { toast.error('Error: ' + error.message) }
        finally { setLoading(false) }
    }

    const handleSchedulePost = async () => {
        if (!scheduledDate || !scheduledTime) { toast.error('Please select date and time'); return }
        if (!mediaPreview && !mediaId) { toast.error('Please upload/generate media first'); return }
        setLoading(true)
        try {
            let currentMediaId = mediaId
            if (!currentMediaId && mediaFile) currentMediaId = await uploadMedia(mediaFile)
            if (!currentMediaId && mediaPreview?.startsWith('http') && !mediaFile) {
                const supabase = createClient()
                const { data: asset, error: assetError } = await supabase.from('media_assets').insert({ workspace_id: workspaceId, url: mediaPreview, type: 'image', storage_path: 'ai-generated/' + Math.random().toString(36).substring(7) }).select().single()
                if (assetError) throw assetError
                currentMediaId = asset.id
            }
            if (!currentMediaId) throw new Error('Media preparation failed')
            const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
            const response = await fetch('/api/posts/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, socialAccountId: selectedAccount, caption, scheduledAt: scheduledAt.toISOString(), mediaId: currentMediaId }) })
            if (response.ok) { toast.success('Post scheduled successfully!'); window.location.href = '/calendar' }
            else { const data = await response.json(); throw new Error(data.error || 'Failed to schedule post') }
        } catch (error: any) { toast.error('Error: ' + error.message) }
        finally { setLoading(false) }
    }

    const selectedPlatform = socialAccounts.find(a => a.id === selectedAccount)?.platform?.toLowerCase() || 'instagram'
    const config = platformConfig[selectedPlatform] || platformConfig.instagram

    return (
        <div className="grid lg:grid-cols-5 gap-8">
            {/* Left - Form */}
            <div className="lg:col-span-3 space-y-6">
                {/* Step 1: Media */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                        <h3 className="font-bold text-gray-900 dark:text-white">Upload Media</h3>
                    </div>
                    <div className="p-5">
                        {mediaPreview ? (
                            <div className="relative group">
                                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                                    <Image src={mediaPreview} alt="Preview" fill className="object-cover" unoptimized />
                                </div>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-2xl flex items-center justify-center gap-3">
                                    <button onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaId(null) }} className="px-4 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors">
                                        <Trash2 size={16} /> Remove
                                    </button>
                                    <button onClick={() => setShowAIStudio(true)} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-purple-700 transition-colors">
                                        <Wand2 size={16} /> AI Studio
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <label className="aspect-video rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-2">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Upload size={24} className="text-blue-600" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Upload File</span>
                                    <span className="text-xs text-gray-400">JPG, PNG, MP4</span>
                                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                                </label>
                                <button onClick={() => setShowAIStudio(true)} className="aspect-video rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all flex flex-col items-center justify-center gap-2">
                                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <Wand2 size={24} className="text-purple-600" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">AI Generate</span>
                                    <span className="text-xs text-gray-400">Create with AI</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2: Caption */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-sm font-bold">2</span>
                            <h3 className="font-bold text-gray-900 dark:text-white">Write Caption</h3>
                        </div>
                        <button onClick={handleGenerateAI} disabled={loading || !userInput.trim()} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50 transition-all">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {loading ? 'Generating...' : 'AI Assist'}
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            rows={2}
                            placeholder="What's your post about? (e.g., New product launch, behind the scenes...)"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-gray-400"
                        />

                        {aiGeneration && (
                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                {(['short', 'medium', 'long'] as const).map((len) => (
                                    <button
                                        key={len}
                                        onClick={() => { setSelectedCaption(aiGeneration.captions[len]); setCaption(selectedHook + '\n\n' + aiGeneration.captions[len] + '\n\n' + aiGeneration.hashtags.join(' ')) }}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${selectedCaption === aiGeneration.captions[len] ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {len}
                                    </button>
                                ))}
                            </div>
                        )}

                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={5}
                            placeholder="Your caption will appear here..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Step 3: Schedule */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center text-sm font-bold">3</span>
                        <h3 className="font-bold text-gray-900 dark:text-white">Schedule Post</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        {/* Account Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Post to</label>
                            <div className="flex flex-wrap gap-2">
                                {socialAccounts.map((account) => {
                                    const pConfig = platformConfig[account.platform?.toLowerCase()] || platformConfig.instagram
                                    return (
                                        <button
                                            key={account.id}
                                            onClick={() => setSelectedAccount(account.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${selectedAccount === account.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                        >
                                            <span className={`w-6 h-6 rounded-lg ${pConfig.bg} flex items-center justify-center text-white text-xs`}>{pConfig.icon}</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{account.account_name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Date/Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Time</label>
                                <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 outline-none" />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button onClick={handlePublishNow} disabled={loading} className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-all">
                                <Send size={18} /> Publish Now
                            </button>
                            <button onClick={handleSchedulePost} disabled={loading || !scheduledDate || !scheduledTime} className="flex-1 py-3.5 bg-orange-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/25">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
                                {loading ? 'Processing...' : 'Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right - Preview */}
            <div className="lg:col-span-2">
                <div className="sticky top-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-500">Preview</span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                        </span>
                    </div>

                    {/* Phone Frame */}
                    <div className="bg-white dark:bg-black rounded-[2.5rem] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-900">
                            <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center text-white text-lg`}>
                                {config.icon}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{socialAccounts.find(a => a.id === selectedAccount)?.account_name || 'account'}</p>
                                <p className="text-xs text-gray-400">Original Audio</p>
                            </div>
                            <span className="flex gap-0.5">
                                <span className="w-1 h-1 rounded-full bg-gray-400" />
                                <span className="w-1 h-1 rounded-full bg-gray-400" />
                                <span className="w-1 h-1 rounded-full bg-gray-400" />
                            </span>
                        </div>

                        {/* Media */}
                        <div className="aspect-square bg-gray-100 dark:bg-gray-900 relative">
                            {mediaPreview ? (
                                <Image src={mediaPreview} alt="Preview" fill className="object-cover" unoptimized />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                        <Upload size={28} className="text-gray-400" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-400">No media yet</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-4">
                                    <Heart size={24} className="text-gray-900 dark:text-white" />
                                    <MessageCircle size={24} className="text-gray-900 dark:text-white" />
                                    <Send size={24} className="text-gray-900 dark:text-white -rotate-12" />
                                </div>
                                <Bookmark size={24} className="text-gray-900 dark:text-white" />
                            </div>
                            <div className="text-sm">
                                <span className="font-bold text-gray-900 dark:text-white">{socialAccounts.find(a => a.id === selectedAccount)?.account_name?.toLowerCase().replace(/\s+/g, '_') || 'account'}</span>{' '}
                                <span className="text-gray-600 dark:text-gray-400 line-clamp-3">{caption || 'Your caption here...'}</span>
                            </div>
                            <p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-600 dark:text-blue-400">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>Preview approximates how your post will appear. Actual appearance may vary.</span>
                    </div>
                </div>
            </div>

            {/* AI Studio Modal */}
            {showAIStudio && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAIStudio(false)} />
                    <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <Sparkles size={20} className="text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">AI Image Studio</h3>
                                    <p className="text-xs text-gray-500">Generate images with AI</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAIStudio(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <AIImageStudio workspaceId={workspaceId} onSelect={handleSelectAIImage} onClose={() => setShowAIStudio(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
