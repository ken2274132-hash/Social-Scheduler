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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* How It Works - Step Indicator */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/50">
                <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-4">How It Works</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0">
                    {[
                        { step: 1, title: 'Configure', desc: 'Choose account & schedule' },
                        { step: 2, title: 'Add Content', desc: 'Upload or import items' },
                        { step: 3, title: 'Schedule', desc: 'Auto-post at set times' },
                    ].map((item, i) => (
                        <div key={item.step} className="flex items-center gap-3 sm:flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                (item.step === 1 && selectedAccount) ||
                                (item.step === 2 && scheduledItems.length > 0) ||
                                (item.step === 3 && scheduledItems.length > 0 && selectedAccount)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}>
                                {item.step}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                            </div>
                            {i < 2 && <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 hidden sm:block ml-auto mr-4" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Auto Workflow</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Batch schedule posts with automatic date spacing</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowItemPicker(true)}
                        className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Plus size={16} /> Add Content
                    </button>
                    <button
                        onClick={createWorkflow}
                        disabled={creating || scheduledItems.length === 0 || !selectedAccount}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/20"
                    >
                        {creating ? <Clock size={16} className="animate-spin" /> : <Share2 size={16} />}
                        {creating ? 'Processing...' : `Schedule ${scheduledItems.length} Posts`}
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Left - Config */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm">
                        <div className="px-5 py-3.5 border-b border-slate-50 dark:border-slate-800/50">
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">Workflow Settings</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Destination */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Destination</label>
                                <p className="text-[10px] text-slate-400 -mt-1">Where to post your content</p>
                                <select
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                                >
                                    <option value="">Select account...</option>
                                    {socialAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.platform.toUpperCase()}: {account.account_name || 'Connected'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Schedule */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
                                    <p className="text-[10px] text-slate-400 -mt-1">First post date</p>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Post Time</label>
                                    <p className="text-[10px] text-slate-400 -mt-1">Daily time</p>
                                    <input
                                        type="time"
                                        value={postTime}
                                        onChange={(e) => setPostTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Frequency */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Frequency</label>
                                <p className="text-[10px] text-slate-400 -mt-1">Days between each post</p>
                                <div className="space-y-2">
                                    {(['daily', 'every2days', 'weekly'] as const).map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setInterval(opt)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${interval === opt
                                                ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-medium'
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <span className="text-xs">
                                                {opt === 'daily' ? 'Every Day' : opt === 'every2days' ? 'Every 2 Days' : 'Every Week'}
                                            </span>
                                            {interval === opt && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles size={60} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">
                                <Wand2 size={12} /> Quick Guide
                            </h4>
                            <ol className="text-[11px] text-indigo-100 leading-relaxed space-y-1.5">
                                <li>1. Select your social account above</li>
                                <li>2. Set start date and posting frequency</li>
                                <li>3. Click "Add Content" to add items</li>
                                <li>4. Hit "Schedule" to create all posts</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Right - Queue */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-sm">
                        <div className="px-5 py-3.5 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">Content Queue</h3>
                            {scheduledItems.length > 0 && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {scheduledItems.length} items queued
                                </span>
                            )}
                        </div>
                        <div className="p-6">
                            {scheduledItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Calendar size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">No content in queue yet</p>
                                    <p className="text-xs text-slate-500 mt-1 mb-6 max-w-xs mx-auto">
                                        Add images or products. Each item will be scheduled based on your frequency settings.
                                    </p>
                                    <button onClick={() => setShowItemPicker(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm">
                                        <Plus size={14} className="inline mr-1.5 -mt-0.5" />
                                        Add First Item
                                    </button>

                                    {/* Quick example */}
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3">Example with 3 items & "Every 2 Days"</p>
                                        <div className="flex justify-center gap-2 text-[10px]">
                                            <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">Feb 7</span>
                                            <span className="text-slate-300">→</span>
                                            <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">Feb 9</span>
                                            <span className="text-slate-300">→</span>
                                            <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">Feb 11</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {scheduledItems.map((scheduled, index) => (
                                        <div key={index} className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100/50 dark:border-slate-800/50 group">
                                            <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700">
                                                {scheduled.item.image ? (
                                                    <Image src={scheduled.item.image} alt={scheduled.item.title} fill className="object-cover" unoptimized />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                        <ImageIcon size={18} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{scheduled.item.title}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                                        <Calendar size={12} />
                                                        <span>{new Date(scheduled.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                                        <Clock size={12} />
                                                        <span>{scheduled.time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => removeItem(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Item Picker Modal */}
            {showItemPicker && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowItemPicker(false)} />
                    <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-300 max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Content Library</h3>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                                    <button onClick={() => setActiveTab('upload')} className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Upload</button>
                                    {shopifyConnected && <button onClick={() => setActiveTab('shopify')} className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${activeTab === 'shopify' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Shopify</button>}
                                    <button onClick={() => setActiveTab('ai')} className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${activeTab === 'ai' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>AI Studio</button>
                                </div>
                            </div>
                            <button onClick={() => setShowItemPicker(false)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {activeTab === 'upload' && (
                                <div className="space-y-6">
                                    {!showManualForm ? (
                                        <button onClick={() => setShowManualForm(true)} className="w-full py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all bg-slate-50/50 dark:bg-slate-800/20">
                                            <Plus size={24} />
                                            <span className="text-xs font-semibold uppercase tracking-wider">Create Custom Entry</span>
                                        </button>
                                    ) : (
                                        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                            <div className="grid sm:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-semibold text-slate-400 uppercase">Title</label>
                                                        <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Post title..." className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500/30" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-semibold text-slate-400 uppercase">Caption</label>
                                                        <textarea value={manualCaption} onChange={(e) => setManualCaption(e.target.value)} placeholder="Post caption..." rows={3} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500/30 resize-none" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-semibold text-slate-400 uppercase">Image</label>
                                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                                    {manualImage ? (
                                                        <div className="relative aspect-square rounded-xl overflow-hidden group">
                                                            <Image src={manualImage} alt="Preview" fill className="object-cover" unoptimized />
                                                            <button onClick={() => setManualImage(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-white dark:hover:bg-slate-900 transition-all">
                                                            {uploading ? <Clock className="animate-spin" size={20} /> : <Upload size={20} />}
                                                            <span className="text-[10px] font-bold uppercase">{uploading ? 'Uploading...' : 'Upload'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                                <button onClick={() => setShowManualForm(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">Cancel</button>
                                                <button onClick={addManualItem} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm">Save to Library</button>
                                            </div>
                                        </div>
                                    )}

                                    {manualItems.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {manualItems.map((item) => (
                                                <button key={item.id} onClick={() => addItemToSchedule(item)} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                                    {item.image ? <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized /> : <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><ImageIcon className="text-slate-300" /></div>}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Add to Queue</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'shopify' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {products.map((product) => (
                                        <button key={product.id} onClick={() => addProductToSchedule(product)} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                            {product.image ? <Image src={product.image} alt={product.title} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized /> : <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Package className="text-slate-300" /></div>}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Import Product</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'ai' && (
                                <AIImageStudio
                                    workspaceId={workspaceId}
                                    onSelect={(url) => {
                                        addItemToSchedule({
                                            id: `ai-${Date.now()}`,
                                            title: 'AI Gen ' + new Date().toLocaleTimeString(),
                                            image: url,
                                            caption: 'Generated via AI Studio'
                                        })
                                    }}
                                    onClose={() => setShowItemPicker(false)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
