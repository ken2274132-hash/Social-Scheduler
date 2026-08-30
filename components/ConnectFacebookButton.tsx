'use client'

import { Facebook } from 'lucide-react'
import { useState } from 'react'

export default function ConnectFacebookButton({ workspaceId }: { workspaceId: string }) {
    const [loading, setLoading] = useState(false)

    // The OAuth flow starts on the server so it can issue a CSRF nonce and
    // resolve the workspace itself, rather than trusting the browser.
    const handleConnect = () => {
        setLoading(true)
        window.location.href = '/api/meta/auth?platform=facebook'
    }

    return (
        <button
            onClick={handleConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-all font-medium disabled:opacity-50"
        >
            <Facebook size={20} />
            {loading ? 'Connecting...' : 'Connect Facebook'}
        </button>
    )
}
