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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Configuration */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Workflow Settings
                    </h3>

                    {/* Social Account */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Post To
                        </label>
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value="">Select account...</option>
                            {socialAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.platform}: {account.account_name || 'Connected'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Post Time */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Post Time
                        </label>
                        <input
                            type="time"
                            value={postTime}
                            onChange={(e) => setPostTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Interval */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Posting Interval
                        </label>
                        <select
                            value={interval}
                            onChange={(e) => setInterval(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value="daily">Every Day</option>
                            <option value="every2days">Every 2 Days</option>
                            <option value="weekly">Every Week</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={createWorkflow}
                    disabled={creating || scheduledItems.length === 0}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {creating ? 'Creating...' : `Schedule ${scheduledItems.length} Posts`}
                </button>
            </div>

            {/* Right: Content Queue */}
            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Scheduled Content ({scheduledItems.length})
                        </h3>
                        <button
                            onClick={() => setShowItemPicker(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                            <Plus size={16} />
                            Add Content
                        </button>
                    </div>

                    {scheduledItems.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                                No content scheduled yet. Click &quot;Add Content&quot; to start.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {scheduledItems.map((scheduled, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg"
                                >
                                    <div className="relative w-16 h-16 flex-shrink-0">
                                        {scheduled.item.image ? (
                                            <Image
                                                src={scheduled.item.image}
                                                alt={scheduled.item.title}
                                                fill
                                                className="object-cover rounded-lg"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                                <ImageIcon size={24} className="text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {scheduled.item.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock size={14} className="text-gray-400" />
                                            <input
                                                type="date"
                                                value={scheduled.date}
                                                onChange={(e) => updateItemDate(index, e.target.value)}
                                                className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                at {scheduled.time}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Picker Modal */}
            {showItemPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Add Content to Schedule
                            </h3>
                            <button
                                onClick={() => setShowItemPicker(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Create Custom Content Button */}
                        <div className="mb-6">
                            <button
                                onClick={() => setShowManualForm(!showManualForm)}
                                className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                <Plus size={20} />
                                Create Custom Content
                            </button>

                            {showManualForm && (
                                <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={manualTitle}
                                            onChange={(e) => setManualTitle(e.target.value)}
                                            placeholder="Enter content title..."
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Caption
                                        </label>
                                        <textarea
                                            value={manualCaption}
                                            onChange={(e) => setManualCaption(e.target.value)}
                                            placeholder="Enter caption for your post..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Image (Optional)
                                        </label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        {manualImage ? (
                                            <div className="relative w-32 h-32">
                                                <Image
                                                    src={manualImage}
                                                    alt="Preview"
                                                    fill
                                                    className="object-cover rounded-lg"
                                                    unoptimized
                                                />
                                                <button
                                                    onClick={() => setManualImage(null)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <Upload size={16} />
                                                {uploading ? 'Uploading...' : 'Upload Image'}
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={addManualItem}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Add to Library
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Manual Items */}
                        {manualItems.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Your Custom Content
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {manualItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => addItemToSchedule(item)}
                                            className="text-left p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 transition-colors"
                                        >
                                            <div className="relative w-full aspect-square mb-2">
                                                {item.image ? (
                                                    <Image
                                                        src={item.image}
                                                        alt={item.title}
                                                        fill
                                                        className="object-cover rounded-lg"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center">
                                                        <ImageIcon size={32} className="text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {item.title}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shopify Products */}
                        {shopifyConnected && products.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Package size={16} />
                                    Shopify Products
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {products.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => addProductToSchedule(product)}
                                            className="text-left p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 transition-colors"
                                        >
                                            <div className="relative w-full aspect-square mb-2">
                                                {product.image ? (
                                                    <Image
                                                        src={product.image}
                                                        alt={product.title}
                                                        fill
                                                        className="object-cover rounded-lg"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                                        <Package size={32} className="text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {product.title}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                ${product.price}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!shopifyConnected && manualItems.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>Create custom content above, or connect Shopify in Settings to import products.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
