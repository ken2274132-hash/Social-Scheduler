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
        <div className="grid lg:grid-cols-12 gap-10">
            {/* Left - Form */}
            <div className="lg:col-span-7 space-y-6">
                {/* Media */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none">
                    <div className="px-5 py-3.5 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">Media</h3>
                        {mediaPreview && (
                            <button onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaId(null) }} className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors">
                                Remove
                            </button>
                        )}
                    </div>
                    <div className="p-6">
                        {mediaPreview ? (
                            <div className="relative group">
                                <div className="aspect-video rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 relative">
                                    <Image src={mediaPreview} alt="Preview" fill className="object-cover" unoptimized />
                                </div>
                                <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-all rounded-xl flex items-center justify-center">
                                    <button onClick={() => setShowAIStudio(true)} className="px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-xl">
                                        <Wand2 size={14} /> Replace with AI
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <label className="aspect-video rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload size={18} className="text-slate-400" />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">Upload media</span>
                                        <span className="text-[10px] text-slate-400">JPG, PNG, MP4</span>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                                </label>
                                <button onClick={() => setShowAIStudio(true)} className="aspect-video rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-400 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all flex flex-col items-center justify-center gap-3 group">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Wand2 size={18} className="text-slate-400" />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">AI Generator</span>
                                        <span className="text-[10px] text-slate-400">Create from prompt</span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none">
                    <div className="px-5 py-3.5 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">Caption</h3>
                        <button onClick={handleGenerateAI} disabled={loading || !userInput.trim()} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:text-indigo-700 disabled:opacity-50 transition-all">
                            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {loading ? 'Thinking...' : 'AI Refine'}
                        </button>
                    </div>
                    <div className="p-6 space-y-5">
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            rows={2}
                            placeholder="Briefly describe your post idea..."
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm resize-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-400"
                        />

                        {aiGeneration && (
                            <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                {(['short', 'medium', 'long'] as const).map((len) => (
                                    <button
                                        key={len}
                                        onClick={() => { setSelectedCaption(aiGeneration.captions[len]); setCaption(selectedHook + '\n\n' + aiGeneration.captions[len] + '\n\n' + aiGeneration.hashtags.join(' ')) }}
                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${selectedCaption === aiGeneration.captions[len] ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {len}
                                    </button>
                                ))}
                            </div>
                        )}

                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={6}
                            placeholder="The final caption will be displayed here..."
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm resize-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Schedule */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none">
                    <div className="px-5 py-3.5 border-b border-slate-50 dark:border-slate-800/50">
                        <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">Settings</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Account Selector */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Destination</label>
                            <div className="flex flex-wrap gap-2">
                                {socialAccounts.map((account) => {
                                    const pConfig = platformConfig[account.platform?.toLowerCase()] || platformConfig.instagram
                                    const isActive = selectedAccount === account.id
                                    return (
                                        <button
                                            key={account.id}
                                            onClick={() => setSelectedAccount(account.id)}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[13px] transition-all ${isActive ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <span className={`w-2.5 h-2.5 rounded-full ${pConfig.bg} shadow-sm`} />
                                            <span className="font-medium">{account.account_name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Date & Time Picker */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Schedule Date</label>
                                <div className="relative">
                                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all" />
                                    <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Time</label>
                                <div className="relative">
                                    <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all" />
                                    <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button onClick={handleSchedulePost} disabled={loading || !scheduledDate || !scheduledTime} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/20">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                                {loading ? 'Scheduling...' : 'Schedule Post'}
                            </button>
                            <button onClick={handlePublishNow} disabled={loading} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                                <Send size={16} /> Publish Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right - Preview */}
            <div className="lg:col-span-5">
                <div className="sticky top-10 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Post Preview</label>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">{selectedPlatform}</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-none">
                        {/* Preview Header */}
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-slate-800/50">
                            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center text-white text-[10px] shadow-sm`}>
                                {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{socialAccounts.find(a => a.id === selectedAccount)?.account_name || 'username'}</p>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                <ChevronDown size={14} />
                            </button>
                        </div>

                        {/* Preview Media */}
                        <div className="aspect-square bg-slate-50 dark:bg-slate-800 relative">
                            {mediaPreview ? (
                                <Image src={mediaPreview} alt="Preview" fill className="object-cover" unoptimized />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                                        <Upload size={20} className="text-slate-300" />
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400">Media will appear here</span>
                                </div>
                            )}
                        </div>

                        {/* Preview Actions */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-4">
                                    <Heart size={22} className="text-slate-900 dark:text-slate-100" />
                                    <MessageCircle size={22} className="text-slate-900 dark:text-slate-100" />
                                    <Send size={22} className="text-slate-900 dark:text-slate-100 -rotate-12" />
                                </div>
                                <Bookmark size={22} className="text-slate-900 dark:text-slate-100" />
                            </div>
                            <div className="text-[13px] leading-relaxed">
                                <span className="font-bold text-slate-900 dark:text-white mr-2">{socialAccounts.find(a => a.id === selectedAccount)?.account_name?.toLowerCase().replace(/\s+/g, '_') || 'username'}</span>
                                <span className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{caption || 'Start typing or use AI to generate a caption...'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed italic">
                        Preview is an approximation. Actual post layout may vary by platform.
                    </div>
                </div>
            </div>

            {/* AI Studio Modal */}
            {showAIStudio && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAIStudio(false)} />
                    <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">AI Image Studio</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Generate high-quality visuals for your brand</p>
                            </div>
                            <button onClick={() => setShowAIStudio(false)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <AIImageStudio workspaceId={workspaceId} onSelect={handleSelectAIImage} onClose={() => setShowAIStudio(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
