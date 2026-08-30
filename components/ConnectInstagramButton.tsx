'use client'

import { Instagram } from 'lucide-react'
import { useState } from 'react'

export default function ConnectInstagramButton({ workspaceId }: { workspaceId: string }) {
    const [loading, setLoading] = useState(false)

    // The OAuth flow starts on the server so it can issue a CSRF nonce and
    // resolve the workspace itself, rather than trusting the browser.
    const handleConnect = () => {
        setLoading(true)
        window.location.href = '/api/meta/auth?platform=instagram'
    }

    return (
        <button
            onClick={handleConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50"
        >
            <Instagram size={20} />
            {loading ? 'Connecting...' : 'Connect Instagram'}
        </button>
    )
}
