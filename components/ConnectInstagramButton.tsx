'use client'

import { Instagram } from 'lucide-react'

export default function ConnectInstagramButton({ workspaceId }: { workspaceId: string }) {
    const handleConnect = () => {
        const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID
        const redirectUri = `${window.location.origin}/api/auth/callback/meta`

        const scope = [
            'instagram_basic',
            'instagram_content_publish',
            'pages_show_list',
            'pages_read_engagement'
        ].join(',')

        const state = btoa(JSON.stringify({ workspaceId }))

        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&response_type=code`

        window.location.href = authUrl
    }

    return (
        <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
        >
            <Instagram size={20} />
            Connect Instagram
        </button>
    )
}
