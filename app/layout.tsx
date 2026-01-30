import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import LoadingBar from "@/components/LoadingBar";
import { Toaster } from "sonner";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "Social Media Scheduler - AI-Powered Auto Posting for Instagram & Facebook",
        template: "%s | Social Media Scheduler"
    },
    description: "Automate your social media presence with AI-powered content generation and scheduling. Upload once, post everywhere. Schedule Instagram and Facebook posts with smart captions, hooks, and hashtags.",
    keywords: [
        "social media scheduler",
        "instagram auto post",
        "facebook auto post",
        "AI content generation",
        "social media automation",
        "instagram scheduler",
        "facebook scheduler",
        "content repurpose",
        "AI captions",
        "social media management"
    ],
    authors: [{ name: "Social Media Scheduler" }],
    creator: "Social Media Scheduler",
    publisher: "Social Media Scheduler",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "/",
        siteName: "Social Media Scheduler",
        title: "Social Media Scheduler - AI-Powered Auto Posting",
        description: "Automate your social media presence with AI-powered content generation and scheduling. Upload once, post everywhere.",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Social Media Scheduler",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Social Media Scheduler - AI-Powered Auto Posting",
        description: "Automate your social media presence with AI-powered content generation and scheduling.",
        images: ["/og-image.png"],
        creator: "@socialmediascheduler",
    },
    robots: {
        index: process.env.NODE_ENV === 'production',
        follow: process.env.NODE_ENV === 'production',
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    verification: {
        // Add your verification codes when you have them
        // google: 'your-google-verification-code',
        // yandex: 'your-yandex-verification-code',
    },
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className={`${geistSans.variable} antialiased`}>
                <Suspense fallback={null}>
                    <LoadingBar />
                </Suspense>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: 'var(--background)',
                                border: '1px solid var(--border)',
                                borderRadius: '1rem',
                            },
                            classNames: {
                                success: 'text-success',
                                error: 'text-danger',
                            }
                        }}
                        richColors
                        closeButton
                    />
                </ThemeProvider>
            </body>
        </html>
    );
}
