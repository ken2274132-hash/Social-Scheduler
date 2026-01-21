'use client'

import { Store, ExternalLink, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

type ShopifyConnection = {
    connected: boolean
    shopName?: string
    shopDomain?: string
    connectedAt?: string
}

export default function ShopifyStatus() {
    const [status, setStatus] = useState<ShopifyConnection | null>(null)
    const [loading, setLoading] = useState(true)
    const [disconnecting, setDisconnecting] = useState(false)

    useEffect(() => {
        fetchStatus()
    }, [])

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/shopify/status')
            const data = await res.json()
            setStatus(data)
        } catch (error) {
            setStatus({ connected: false })
        } finally {
            setLoading(false)
        }
    }

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect your Shopify store?')) return

        setDisconnecting(true)
        try {
            await fetch('/api/shopify/status', { method: 'DELETE' })
            setStatus({ connected: false })
            window.location.reload()
        } catch (error) {
            alert('Failed to disconnect Shopify')
        } finally {
            setDisconnecting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-green-500"></div>
            </div>
        )
    }

    if (!status?.connected) {
        return (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                <Store className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No store connected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connect your Shopify store above to import products
                </p>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-green-500 transition-colors">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#96BF48] flex items-center justify-center text-white">
                    <Store size={24} />
                </div>
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                        {status.shopName || status.shopDomain}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Connected {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : ''}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <a
                    href={`https://${status.shopDomain}/admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Open Shopify Admin"
                >
                    <ExternalLink size={20} />
                </a>
                <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Disconnect store"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    )
}
