import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Social Media Scheduler',
        short_name: 'SMS',
        description: 'AI-Powered Social Media Auto Posting',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#5932EA',
    }
}
