import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Lets a production build be made without clobbering the dev server's .next
    distDir: process.env.NEXT_DIST_DIR || '.next',
    images: {
        // Cloudflare Workers cannot run Next's own image optimizer. Serving
        // the originals keeps the deploy on the free plan; the alternative is
        // a Cloudflare Images binding, which is billed. remotePatterns is
        // still required — it is what allows these hosts at all.
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'scontent.cdninstagram.com',
            },
            {
                protocol: 'https',
                hostname: 'platform-lookaside.fbsbx.com',
            },
            {
                protocol: 'https',
                hostname: '*.fbcdn.net',
            },
            {
                protocol: 'https',
                hostname: '*.instagram.com',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'image.pollinations.ai',
            }
        ],
    },
    // Performance optimizations
    poweredByHeader: false,
    compress: true,
    reactStrictMode: true,
    // Optimize package imports to reduce bundle size
    experimental: {
        optimizePackageImports: ['lucide-react'],
    },
    // M4: baseline security headers
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                ],
            },
        ]
    },
};

export default nextConfig;
