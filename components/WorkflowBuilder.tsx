'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, Plus, Trash2, ChevronRight, Package, Clock, ImageIcon, Upload, Instagram, Facebook, Share2, X, Sparkles, Wand2 } from 'lucide-react'
import Image from 'next/image'
import AIImageStudio from './AIImageStudio'

type Product = {
    id: string
    title: string
    image: string | null
    price: string
    url: string
}

type ContentItem = {
    id: string
    title: string
    image: string | null
    caption: string
}

type ScheduledItem = {
    item: ContentItem
    date: string
    time: string
}

type SocialAccount = {
    id: string
    platform: string
    account_name: string | null
}

export default function WorkflowBuilder({
    workspaceId,
    socialAccounts
}: {
    workspaceId: string
    socialAccounts: SocialAccount[]
}) {
    const [products, setProducts] = useState<Product[]>([])
    const [manualItems, setManualItems] = useState<ContentItem[]>([])
    const [loading, setLoading] = useState(true)
    const [shopifyConnected, setShopifyConnected] = useState(false)
    const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([])
    const [selectedAccount, setSelectedAccount] = useState<string>('')
    const [startDate, setStartDate] = useState(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    })
    const [postTime, setPostTime] = useState('10:00')
    const [interval, setInterval] = useState<'daily' | 'every2days' | 'weekly'>('daily')
    const [creating, setCreating] = useState(false)
    const [showItemPicker, setShowItemPicker] = useState(false)
    const [activeTab, setActiveTab] = useState<'upload' | 'shopify' | 'ai'>('upload')
    const [showManualForm, setShowManualForm] = useState(false)
    const [manualTitle, setManualTitle] = useState('')
    const [manualCaption, setManualCaption] = useState('')
    const [manualImage, setManualImage] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const hasAnyConnectedAccount = socialAccounts.length > 0

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/shopify/products')
            const data = await res.json()

            if (data.connected) {
                setShopifyConnected(true)
                setProducts(data.products || [])
            } else {
                setShopifyConnected(false)
            }
        } catch (error) {
            console.error('Failed to fetch products:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            // Ideally, we'd use the same Supabase upload logic as ComposerForm
            // For now, staying consistent with the existing helper API if it exists
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            if (res.ok) {
                const data = await res.json()
                setManualImage(data.url)
            }
        } catch (error) {
            console.error('Upload failed:', error)
        } finally {
            setUploading(false)
        }
    }

    const addManualItem = () => {
        if (!manualTitle.trim()) {
            alert('Please enter a title')
            return
        }

        const newItem: ContentItem = {
            id: `manual-${Date.now()}`,
            title: manualTitle,
            image: manualImage,
            caption: manualCaption || manualTitle
        }

        setManualItems([...manualItems, newItem])
        setManualTitle('')
        setManualCaption('')
        setManualImage(null)
        setShowManualForm(false)
    }

    const addItemToSchedule = (item: ContentItem) => {
        const lastDate = scheduledItems.length > 0
            ? scheduledItems[scheduledItems.length - 1].date
            : startDate

        let nextDate = new Date(lastDate)
        if (scheduledItems.length > 0) {
            if (interval === 'daily') nextDate.setDate(nextDate.getDate() + 1)
            else if (interval === 'every2days') nextDate.setDate(nextDate.getDate() + 2)
            else if (interval === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
        }

        setScheduledItems([...scheduledItems, {
            item,
            date: nextDate.toISOString().split('T')[0],
            time: postTime
        }])
        setShowItemPicker(false)
    }

    const addProductToSchedule = (product: Product) => {
        const contentItem: ContentItem = {
            id: product.id,
            title: product.title,
            image: product.image,
            caption: `${product.title}\n\n🛒 Shop now: ${product.url}\n\n#shopify #product #sale`
        }
        addItemToSchedule(contentItem)
    }

    const removeItem = (index: number) => {
        setScheduledItems(scheduledItems.filter((_, i) => i !== index))
    }

    const updateItemDate = (index: number, date: string) => {
        const updated = [...scheduledItems]
        updated[index].date = date
        setScheduledItems(updated)
    }

    const createWorkflow = async () => {
        if (!selectedAccount) {
            alert('Please select a social account')
            return
        }
        if (scheduledItems.length === 0) {
            alert('Please add at least one item')
            return
        }

        setCreating(true)
        try {
            for (const scheduled of scheduledItems) {
                const scheduledAt = new Date(`${scheduled.date}T${scheduled.time}:00`)

                const res = await fetch('/api/posts/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        workspaceId,
                        socialAccountId: selectedAccount,
                        caption: scheduled.item.caption,
                        mediaUrl: scheduled.item.image,
                        scheduledAt: scheduledAt.toISOString(),
                    })
                })

                if (!res.ok) {
                    throw new Error('Failed to create post')
                }
            }

            alert(`Successfully scheduled ${scheduledItems.length} posts!`)
            setScheduledItems([])
        } catch (error: any) {
            alert('Error creating workflow: ' + error.message)
        } finally {
            setCreating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-500"></div>
            </div>
        )
    }

    if (!hasAnyConnectedAccount) {
        return (
            <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 p-16 text-center max-w-2xl mx-auto shadow-sm">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Share2 className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4">
                    Connect a Social Account First
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 leading-relaxed uppercase text-[10px] tracking-widest px-10">
                    To use the Workflow Builder, connect at least one social account (Instagram, Facebook, or Pinterest) in Settings.
                </p>
                <a
                    href="/settings"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/20"
                >
                    Enable Accounts
                    <ChevronRight size={18} />
                </a>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start pb-20">
            {/* Left: Configuration */}
            <div className="lg:col-span-1 space-y-8">
                <div className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.08] transition-transform duration-700 group-hover:scale-110 -rotate-12 translate-x-4 -translate-y-4">
                        <Calendar size={120} />
                    </div>

                    <header className="relative mb-8">
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                            Sync Settings
                        </h2>
                    </header>

                    <div className="space-y-6 relative z-10">
                        {/* Social Account */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                                Target Channel
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    className="w-full appearance-none px-6 py-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none transition-all cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                                >
                                    <option value="">Select account...</option>
                                    {socialAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.platform.toUpperCase()}: {account.account_name || 'Connected'}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <Share2 size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                                    Launch Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-6 py-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                                    Preferred Time
                                </label>
                                <input
                                    type="time"
                                    value={postTime}
                                    onChange={(e) => setPostTime(e.target.value)}
                                    className="w-full px-6 py-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Interval */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                                Frequency
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {(['daily', 'every2days', 'weekly'] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setInterval(opt)}
                                        className={`flex items-center justify-between px-6 py-4 rounded-2xl border transition-all ${interval === opt
                                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <span className="text-xs font-bold uppercase tracking-widest">
                                            {opt === 'daily' ? 'Every Day' : opt === 'every2days' ? 'Every 2 Days' : 'Every Week'}
                                        </span>
                                        {interval === opt && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={createWorkflow}
                    disabled={creating || scheduledItems.length === 0}
                    className="w-full relative group overflow-hidden bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-6 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-3">
                        {creating ? <Clock className="animate-spin" size={20} /> : <Share2 size={20} />}
                        <span>{creating ? 'Propagating...' : `Deploy ${scheduledItems.length} Posts`}</span>
                    </div>
                </button>
            </div>

            {/* Right: Content Queue */}
            <div className="lg:col-span-2 space-y-8">
                <div className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm">
                    <header className="relative mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-green-500 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                Content Queue
                            </h2>
                        </div>
                        <button
                            onClick={() => setShowItemPicker(true)}
                            className="group flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20"
                        >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                            <span>Add Content</span>
                        </button>
                    </header>

                    {scheduledItems.length === 0 ? (
                        <div className="text-center py-24 border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-[2.5rem] bg-gray-50/30 dark:bg-gray-900/10">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Calendar className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                Queue remains empty. Use the Library to populate.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {scheduledItems.map((scheduled, index) => (
                                <div
                                    key={index}
                                    className="group/item flex items-center gap-6 p-5 bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-3xl hover:border-blue-500/50 transition-all duration-500"
                                >
                                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg shrink-0">
                                        {scheduled.item.image ? (
                                            <Image
                                                src={scheduled.item.image}
                                                alt={scheduled.item.title}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover/item:scale-110"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                                                <ImageIcon size={24} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-black text-gray-900 dark:text-white truncate mb-2">
                                            {scheduled.item.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                                                <Calendar size={12} className="text-blue-600" />
                                                <input
                                                    type="date"
                                                    value={scheduled.date}
                                                    onChange={(e) => updateItemDate(index, e.target.value)}
                                                    className="bg-transparent border-none p-0 text-[10px] font-black text-blue-600 dark:text-blue-400 focus:ring-0 outline-none w-24"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <Clock size={12} className="text-gray-400" />
                                                <span className="text-[10px] font-black text-gray-500 uppercase">
                                                    {scheduled.time}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeItem(index)}
                                        className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Picker Modal */}
            {showItemPicker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-950 rounded-[3.5rem] p-10 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-800/50 animate-in zoom-in-95 duration-300">
                        <header className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                    Content Library
                                </h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Source assets for your bulk schedule</p>
                            </div>
                            <button
                                onClick={() => setShowItemPicker(false)}
                                className="w-14 h-14 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-3xl text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold"
                            >
                                <X size={24} />
                            </button>
                        </header>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-10 p-1.5 bg-gray-100 dark:bg-gray-900/50 rounded-2xl w-fit">
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm scale-[1.02]' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Custom Asset
                            </button>
                            {shopifyConnected && (
                                <button
                                    onClick={() => setActiveTab('shopify')}
                                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'shopify' ? 'bg-white dark:bg-gray-800 text-green-600 shadow-sm scale-[1.02]' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Shopify
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ai' ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm scale-[1.02]' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                AI Studio
                            </button>
                        </div>

                        {activeTab === 'upload' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
                                {/* Upload Form Toggle */}
                                {!showManualForm && (
                                    <button
                                        onClick={() => setShowManualForm(true)}
                                        className="w-full group relative py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-4 bg-gray-50/50 dark:bg-gray-900/30"
                                    >
                                        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform text-blue-600">
                                            <Plus size={28} />
                                        </div>
                                        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Construct Custom Asset</span>
                                    </button>
                                )}

                                {showManualForm && (
                                    <div className="p-8 bg-blue-50/30 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/20 space-y-6">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Title</label>
                                                    <input
                                                        type="text"
                                                        value={manualTitle}
                                                        onChange={(e) => setManualTitle(e.target.value)}
                                                        placeholder="Summer Collection Lookbook..."
                                                        className="w-full px-6 py-4 bg-white dark:bg-gray-950 border border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all shadow-sm"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Caption</label>
                                                    <textarea
                                                        value={manualCaption}
                                                        onChange={(e) => setManualCaption(e.target.value)}
                                                        placeholder="Write your story..."
                                                        rows={4}
                                                        className="w-full px-6 py-4 bg-white dark:bg-gray-950 border border-transparent focus:border-blue-500 rounded-2xl text-sm font-medium outline-none transition-all resize-none shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Featured Visual</label>
                                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

                                                {manualImage ? (
                                                    <div className="relative aspect-square w-full group/img">
                                                        <Image src={manualImage} alt="Preview" fill className="object-cover rounded-[2rem] shadow-xl" unoptimized />
                                                        <button onClick={() => setManualImage(null)} className="absolute top-4 right-4 bg-red-600 text-white rounded-xl p-3 shadow-lg hover:scale-110 transition-transform">
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploading}
                                                        className="w-full aspect-square flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-950 rounded-[2rem] border-2 border-dashed border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-white transition-all shadow-sm"
                                                    >
                                                        <Upload size={32} />
                                                        <span className="text-xs font-black uppercase tracking-widest">{uploading ? 'Synthesizing...' : 'Upload File'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-4">
                                            <button onClick={() => setShowManualForm(false)} className="flex-1 py-5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all">Cancel</button>
                                            <button onClick={addManualItem} className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02]">Save to Library</button>
                                        </div>
                                    </div>
                                )}

                                {manualItems.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {manualItems.map((item) => (
                                            <button key={item.id} onClick={() => addItemToSchedule(item)} className="group/asset text-left p-3 bg-gray-50/50 dark:bg-gray-900/50 rounded-[2.5rem] border border-transparent hover:border-blue-500/50 hover:bg-white dark:hover:bg-gray-900 transition-all duration-500">
                                                <div className="relative aspect-square mb-4 overflow-hidden rounded-[1.8rem] shadow-md">
                                                    {item.image ? (
                                                        <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-700 group-hover/asset:scale-110" unoptimized />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                                                            <ImageIcon size={32} className="text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="px-3 pb-2">
                                                    <p className="text-xs font-black text-gray-900 dark:text-white truncate">{item.title}</p>
                                                    <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">Add to Queue</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'shopify' && shopifyConnected && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
                                {products.map((product) => (
                                    <button key={product.id} onClick={() => addProductToSchedule(product)} className="group/product text-left p-3 bg-gray-50/50 dark:bg-gray-900/50 rounded-[2.5rem] border border-transparent hover:border-green-500/50 hover:bg-white dark:hover:bg-gray-900 transition-all duration-500">
                                        <div className="relative aspect-square mb-4 overflow-hidden rounded-[1.8rem] shadow-md">
                                            {product.image ? (
                                                <Image src={product.image} alt={product.title} fill className="object-cover transition-transform duration-700 group-hover/product:scale-110" unoptimized />
                                            ) : (
                                                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Package size={32} className="text-gray-300" /></div>
                                            )}
                                        </div>
                                        <div className="px-3 pb-2">
                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">{product.title}</p>
                                            <p className="text-[10px] font-bold text-green-600 uppercase mt-1">Import Post</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="animate-in fade-in duration-500">
                                <AIImageStudio
                                    workspaceId={workspaceId}
                                    onSelect={(url) => {
                                        addItemToSchedule({
                                            id: `ai-${Date.now()}`,
                                            title: 'AI Synthesis ' + new Date().toLocaleTimeString(),
                                            image: url,
                                            caption: 'Generated via AI Social Architect'
                                        })
                                    }}
                                    onClose={() => setShowItemPicker(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
