'use client'

import { Store } from 'lucide-react'
import { useState } from 'react'

export default function ConnectShopifyButton({ workspaceId }: { workspaceId: string }) {
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [shopDomain, setShopDomain] = useState('')

    const handleConnect = () => {
        if (!shopDomain) {
            alert('Please enter your Shopify store domain')
            return
        }

        // Format the domain
        let domain = shopDomain.trim().toLowerCase()
        if (!domain.includes('.myshopify.com')) {
            domain = `${domain}.myshopify.com`
        }

        setLoading(true)
        window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(domain)}`
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#96BF48] hover:bg-[#7CAA3C] text-white rounded-lg font-medium text-sm transition-colors"
            >
                <Store size={20} />
                Connect Shopify
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Connect Shopify Store
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Enter your Shopify store domain to connect your products.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Store Domain
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={shopDomain}
                                    onChange={(e) => setShopDomain(e.target.value)}
                                    placeholder="your-store"
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                    .myshopify.com
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConnect}
                                disabled={loading || !shopDomain}
                                className="flex-1 px-4 py-2 bg-[#96BF48] hover:bg-[#7CAA3C] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
