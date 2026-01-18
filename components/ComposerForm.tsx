'use client'

import { useState } from 'react'
import { Sparkles, Calendar, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
    const [step, setStep] = useState<number>(1)

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

        setLoading(true)
        try {
            const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)

            const response = await fetch('/api/posts/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    socialAccountId: selectedAccount,
                    caption,
                    scheduledAt: scheduledAt.toISOString(),
                    mediaId: null, // Will be set by API after upload
                }),
            })

            if (response.ok) {
                alert('Post scheduled successfully!')
                window.location.href = '/calendar'
            } else {
                throw new Error('Failed to schedule post')
            }
        } catch (error) {
            alert('Failed to schedule post')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Content Input */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Your Content
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Describe your post
                            </label>
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                rows={6}
                                placeholder="Example: Announcing our new summer collection! Bright colors, comfortable fabrics, perfect for beach days..."
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>

                        <button
                            onClick={handleGenerateAI}
                            disabled={loading || !userInput.trim()}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            <Sparkles size={20} />
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
