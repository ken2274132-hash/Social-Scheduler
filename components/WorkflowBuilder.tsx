'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, Plus, Trash2, ChevronRight, Package, Clock, ImageIcon, Upload, Instagram, Facebook, Share2 } from 'lucide-react'
import Image from 'next/image'

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

    const getPlatformIcon = (platform: string) => {
        switch (platform.toLowerCase()) {
            case 'instagram': return <Instagram size={16} className="text-pink-500" />
            case 'facebook': return <Facebook size={16} className="text-blue-600" />
            case 'pinterest': return <Share2 size={16} className="text-red-600" />
            default: return <Share2 size={16} />
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-500"></div>
            </div>
        )
    }

    // Show "Connect Account" only if NO social accounts are connected
    if (!hasAnyConnectedAccount) {
        return (
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <Share2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Connect a Social Account First
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    To use the Workflow Builder, connect at least one social account (Instagram, Facebook, or Pinterest) in Settings.
                </p>
                <a
                    href="/settings"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Go to Settings
                    <ChevronRight size={16} />
                </a>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Left: Configuration */}
            <div className="lg:col-span-1 space-y-8">
                <div className="group relative bg-white/50 dark:bg-gray-950/50 backdrop-blur-3xl rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.08] transition-transform duration-700 group-hover:scale-110 -rotate-12 translate-x-4 -translate-y-4">
                        <Calendar size={120} />
                    </div>

                    <header className="relative mb-8">
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                            Workflow Settings
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

                        {/* Start Date */}
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

                        {/* Post Time */}
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

                        {/* Interval */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                                Posting Cadence
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
                                        <span className="text-sm font-bold uppercase tracking-widest">
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
                        <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-[2.5rem] bg-gray-50/30 dark:bg-gray-900/10">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Calendar className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                Queue remains empty. Click &quot;Add Content&quot; to begin.
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
                    <div className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl rounded-[3rem] p-10 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-800/50 animate-in zoom-in-95 duration-300">
                        <header className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                Content Library
                            </h3>
                            <button
                                onClick={() => setShowItemPicker(false)}
                                className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold"
                            >
                                ✕
                            </button>
                        </header>

                        {/* Create Custom Content Trigger */}
                        <div className="mb-10">
                            <button
                                onClick={() => setShowManualForm(!showManualForm)}
                                className="w-full group relative py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-3 bg-gray-50/50 dark:bg-gray-900/30"
                            >
                                <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Plus size={24} className="text-blue-600" />
                                </div>
                                <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Create Custom Asset</span>
                            </button>

                            {showManualForm && (
                                <div className="mt-8 p-8 bg-blue-50/30 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 space-y-6 animate-in slide-in-from-top-4 duration-500">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={manualTitle}
                                            onChange={(e) => setManualTitle(e.target.value)}
                                            placeholder="Enter asset title..."
                                            className="w-full px-6 py-4 bg-white dark:bg-gray-950 border border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={manualCaption}
                                            onChange={(e) => setManualCaption(e.target.value)}
                                            placeholder="Enter caption for your post..."
                                            rows={3}
                                            className="w-full px-6 py-4 bg-white dark:bg-gray-950 border border-transparent focus:border-blue-500 rounded-2xl text-sm font-medium outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">
                                            Featured Image
                                        </label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        {manualImage ? (
                                            <div className="relative w-40 h-40 group/img">
                                                <Image
                                                    src={manualImage}
                                                    alt="Preview"
                                                    fill
                                                    className="object-cover rounded-[2rem] shadow-xl"
                                                    unoptimized
                                                />
                                                <button
                                                    onClick={() => setManualImage(null)}
                                                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-xl p-2 shadow-lg hover:scale-110 transition-transform"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-gray-950 rounded-2xl border border-dashed border-blue-200 dark:border-blue-800 text-sm font-bold text-blue-600 hover:bg-white transition-all shadow-sm"
                                            >
                                                <Upload size={18} />
                                                <span>{uploading ? 'Processing...' : 'Upload Asset'}</span>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={addManualItem}
                                        className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                    >
                                        Add to Library
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Manual Items */}
                        {manualItems.length > 0 && (
                            <div className="mb-12">
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 px-1">
                                    Custom Assets
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                    {manualItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => addItemToSchedule(item)}
                                            className="group/asset text-left p-2 bg-gray-50/50 dark:bg-gray-900/50 rounded-[2rem] border border-transparent hover:border-blue-500/50 hover:bg-white dark:hover:bg-gray-900 transition-all duration-500"
                                        >
                                            <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-[1.5rem] shadow-md">
                                                {item.image ? (
                                                    <Image
                                                        src={item.image}
                                                        alt={item.title}
                                                        fill
                                                        className="object-cover transition-transform duration-700 group-hover/asset:scale-110"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center">
                                                        <ImageIcon size={32} className="text-gray-300" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover/asset:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="px-3 pb-3">
                                                <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                                                    {item.title}
                                                </p>
                                                <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">Select Asset</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shopify Products */}
                        {shopifyConnected && products.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 px-1 flex items-center gap-2">
                                    <Package size={14} className="text-green-500" />
                                    Shopify Inventory
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                    {products.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => addProductToSchedule(product)}
                                            className="group/product text-left p-2 bg-gray-50/50 dark:bg-gray-900/50 rounded-[2rem] border border-transparent hover:border-green-500/50 hover:bg-white dark:hover:bg-gray-900 transition-all duration-500"
                                        >
                                            <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-[1.5rem] shadow-md">
                                                {product.image ? (
                                                    <Image
                                                        src={product.image}
                                                        alt={product.title}
                                                        fill
                                                        className="object-cover transition-transform duration-700 group-hover/product:scale-110"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                        <Package size={32} className="text-gray-300" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-black shadow-lg">
                                                    ${product.price}
                                                </div>
                                            </div>
                                            <div className="px-3 pb-3">
                                                <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                                                    {product.title}
                                                </p>
                                                <p className="text-[10px] font-bold text-green-600 uppercase mt-1">Import Product</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!shopifyConnected && manualItems.length === 0 && (
                            <div className="text-center py-20 px-10 bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                                <Package className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px] leading-relaxed max-w-xs mx-auto">
                                    Create custom assets above, or connect Shopify in Settings to sync your inventory as post content.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
