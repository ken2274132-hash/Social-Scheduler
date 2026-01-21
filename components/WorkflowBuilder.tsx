'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, ChevronRight, Package, Clock } from 'lucide-react'
import Image from 'next/image'

type Product = {
    id: string
    title: string
    image: string | null
    price: string
    url: string
}

type ScheduledProduct = {
    product: Product
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
    const [loading, setLoading] = useState(true)
    const [shopifyConnected, setShopifyConnected] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState<ScheduledProduct[]>([])
    const [selectedAccount, setSelectedAccount] = useState<string>('')
    const [startDate, setStartDate] = useState(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    })
    const [postTime, setPostTime] = useState('10:00')
    const [interval, setInterval] = useState<'daily' | 'every2days' | 'weekly'>('daily')
    const [creating, setCreating] = useState(false)
    const [showProductPicker, setShowProductPicker] = useState(false)

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

    const addProduct = (product: Product) => {
        const lastDate = selectedProducts.length > 0
            ? selectedProducts[selectedProducts.length - 1].date
            : startDate

        let nextDate = new Date(lastDate)
        if (selectedProducts.length > 0) {
            if (interval === 'daily') nextDate.setDate(nextDate.getDate() + 1)
            else if (interval === 'every2days') nextDate.setDate(nextDate.getDate() + 2)
            else if (interval === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
        }

        setSelectedProducts([...selectedProducts, {
            product,
            date: nextDate.toISOString().split('T')[0],
            time: postTime
        }])
        setShowProductPicker(false)
    }

    const removeProduct = (index: number) => {
        setSelectedProducts(selectedProducts.filter((_, i) => i !== index))
    }

    const updateProductDate = (index: number, date: string) => {
        const updated = [...selectedProducts]
        updated[index].date = date
        setSelectedProducts(updated)
    }

    const createWorkflow = async () => {
        if (!selectedAccount) {
            alert('Please select a social account')
            return
        }
        if (selectedProducts.length === 0) {
            alert('Please add at least one product')
            return
        }

        setCreating(true)
        try {
            // Create posts for each scheduled product
            for (const item of selectedProducts) {
                const scheduledAt = new Date(`${item.date}T${item.time}:00`)

                const res = await fetch('/api/posts/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        socialAccountId: selectedAccount,
                        caption: `${item.product.title}\n\n🛒 Shop now: ${item.product.url}\n\n#shopify #product #sale`,
                        mediaUrl: item.product.image,
                        scheduledAt: scheduledAt.toISOString(),
                    })
                })

                if (!res.ok) {
                    throw new Error('Failed to create post')
                }
            }

            alert(`Successfully scheduled ${selectedProducts.length} posts!`)
            setSelectedProducts([])
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

    if (!shopifyConnected) {
        return (
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Connect Shopify First
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    To use the Workflow Builder, connect your Shopify store in Settings.
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
                                    {account.account_name || account.platform}
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
                    disabled={creating || selectedProducts.length === 0}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {creating ? 'Creating...' : `Schedule ${selectedProducts.length} Posts`}
                </button>
            </div>

            {/* Right: Product Queue */}
            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Scheduled Products ({selectedProducts.length})
                        </h3>
                        <button
                            onClick={() => setShowProductPicker(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                            <Plus size={16} />
                            Add Product
                        </button>
                    </div>

                    {selectedProducts.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                                No products scheduled yet. Click "Add Product" to start.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedProducts.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg"
                                >
                                    <div className="relative w-16 h-16 flex-shrink-0">
                                        {item.product.image ? (
                                            <Image
                                                src={item.product.image}
                                                alt={item.product.title}
                                                fill
                                                className="object-cover rounded-lg"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                                <Package size={24} className="text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {item.product.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock size={14} className="text-gray-400" />
                                            <input
                                                type="date"
                                                value={item.date}
                                                onChange={(e) => updateProductDate(index, e.target.value)}
                                                className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                at {item.time}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeProduct(index)}
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

            {/* Product Picker Modal */}
            {showProductPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Select a Product
                            </h3>
                            <button
                                onClick={() => setShowProductPicker(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {products.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => addProduct(product)}
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
                </div>
            )}
        </div>
    )
}
