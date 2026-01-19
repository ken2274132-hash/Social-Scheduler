'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'

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
    socialAccounts
}: {
    workspaceId: string
    socialAccounts: SocialAccount[]
}) {
    const [userInput, setUserInput] = useState<string>('')
    const [aiGeneration, setAiGeneration] = useState<AIGeneration | null>(null)
    const [selectedHook, setSelectedHook] = useState<string>('')
    const [selectedCaption, setSelectedCaption] = useState<string>('')
    const [caption, setCaption] = useState<string>('')
    const [selectedAccount, setSelectedAccount] = useState<string>(socialAccounts[0]?.id || '')
    const [scheduledDate, setScheduledDate] = useState<string>('')
    const [scheduledTime, setScheduledTime] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)
    const [uploading, setUploading] = useState<boolean>(false)
    const [step, setStep] = useState<number>(1)
    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [mediaPreview, setMediaPreview] = useState<string | null>(null)
    const [mediaId, setMediaId] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview
        setMediaFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setMediaPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Reset previous upload state
        setMediaId(null)
    }

    const uploadMedia = async (file: File) => {
        setUploading(true)
        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${workspaceId}/${fileName}`

            const { error: uploadError, data } = await supabase.storage
                .from('media')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath)

            // Save to media_assets table
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

    const handleSchedulePost = async () => {
        if (!scheduledDate || !scheduledTime) {
            alert('Please select date and time')
            return
        }

        if (!mediaFile && !mediaId) {
            alert('Please upload an image or video first')
            return
        }

        setLoading(true)
        try {
            let currentMediaId = mediaId
            if (!currentMediaId && mediaFile) {
                currentMediaId = await uploadMedia(mediaFile)
            }

            if (!currentMediaId) throw new Error('Media upload failed')

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
        <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Content Input & Media */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        1. Media & Intent
                    </h2>

                    <div className="space-y-6">
                        {/* Media Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Image or Video
                            </label>
                            {mediaPreview ? (
                                <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 group">
                                    <Image
                                        src={mediaPreview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    <button
                                        onClick={() => {
                                            setMediaFile(null)
                                            setMediaPreview(null)
                                            setMediaId(null)
                                        }}
                                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center aspect-square w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900/50">
                                    <Upload className="text-gray-400 mb-2" size={32} />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload image</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*,video/*"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                What is this post about?
                            </label>
                            <textarea
                                value={userInput}
                                onChange={handleUserInput}
                                rows={4}
                                placeholder="Example: Announcing our new summer collection! Perfect for beach days..."
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <button
                            onClick={handleGenerateAI}
                            disabled={loading || !userInput.trim() || !mediaPreview}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            {loading ? 'Generating...' : 'Generate AI Variations'}
                        </button>
                    </div>
                </div>
            </div>
            {/* Right: AI Content & Scheduling */}
            <div className="space-y-6">
                {aiGeneration && (
                    <>
                        {/* AI Generated Content */}
                        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Sparkles size={20} className="text-blue-600" />
                                AI Generated Content
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Choose Hook
                                    </label>
                                    <select
                                        value={selectedHook}
                                        onChange={(e) => {
                                            setSelectedHook(e.target.value)
                                            setCaption(e.target.value + '\n\n' + selectedCaption + '\n\n' + aiGeneration.hashtags.join(' '))
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    >
                                        {aiGeneration.hooks.map((hook, i) => (
                                            <option key={i} value={hook}>{hook}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Caption Length
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['short', 'medium', 'long'] as const).map((length) => (
                                            <button
                                                key={length}
                                                onClick={() => {
                                                    setSelectedCaption(aiGeneration.captions[length])
                                                    setCaption(selectedHook + '\n\n' + aiGeneration.captions[length] + '\n\n' + aiGeneration.hashtags.join(' '))
                                                }}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedCaption === aiGeneration.captions[length]
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {length.charAt(0).toUpperCase() + length.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Edit Caption
                                    </label>
                                    <textarea
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        rows={8}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scheduling */}
                        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-blue-600" />
                                Schedule Post
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Account
                                    </label>
                                    <select
                                        value={selectedAccount}
                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    >
                                        {socialAccounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.account_name} ({account.platform})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSchedulePost}
                                    disabled={loading || !scheduledDate || !scheduledTime}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                                >
                                    <Send size={20} />
                                    {loading ? 'Scheduling...' : 'Schedule Post'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
