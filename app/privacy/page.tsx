import Link from 'next/link'

export const metadata = {
    title: 'Privacy Policy | Feedquill',
    description: 'Privacy Policy for Feedquill App',
}

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <Link
                    href="/"
                    className="text-orange-600 hover:underline mb-8 inline-block"
                >
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
                    Privacy Policy
                </h1>

                <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-8 space-y-6 text-gray-700 dark:text-gray-300">
                    <p className="text-sm text-gray-500">Last updated: January 19, 2026</p>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
                        <p>
                            Welcome to Feedquill ("we," "our," or "us"). We are committed to protecting your privacy
                            and personal information. This Privacy Policy explains how we collect, use, disclose, and
                            safeguard your information when you use our social media scheduling application.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">2.1 Information You Provide</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Account registration information (email address, password)</li>
                            <li>Profile information you choose to provide</li>
                            <li>Content you create, upload, or schedule for posting</li>
                            <li>Communications with us</li>
                        </ul>

                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4">2.2 Information from Social Media Platforms</h3>
                        <p>When you connect your Instagram or other social media accounts, we receive:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Your social media profile information (username, profile picture)</li>
                            <li>Access tokens to post content on your behalf</li>
                            <li>Basic account metrics (with your permission)</li>
                        </ul>

                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4">2.3 Automatically Collected Information</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Device information and browser type</li>
                            <li>IP address and location data</li>
                            <li>Usage patterns and interactions with our service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
                        <p>We use the collected information to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Schedule and publish content to your connected social media accounts</li>
                            <li>Send you notifications about your scheduled posts</li>
                            <li>Respond to your inquiries and provide customer support</li>
                            <li>Analyze usage patterns to improve user experience</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Information Sharing</h2>
                        <p>We do not sell your personal information. We may share your information with:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Social Media Platforms:</strong> To publish content you've scheduled</li>
                            <li><strong>Service Providers:</strong> Third-party services that help us operate (hosting, analytics)</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Security</h2>
                        <p>
                            We implement appropriate technical and organizational security measures to protect your
                            personal information. However, no method of transmission over the Internet is 100% secure,
                            and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Access your personal information</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Disconnect your social media accounts at any time</li>
                            <li>Export your data</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Data Retention</h2>
                        <p>
                            We retain your information for as long as your account is active or as needed to provide
                            you services. You can request deletion of your account and associated data at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Children's Privacy</h2>
                        <p>
                            Our service is not intended for users under 13 years of age. We do not knowingly collect
                            personal information from children under 13.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any changes
                            by posting the new Privacy Policy on this page and updating the "Last updated" date.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at:
                        </p>
                        <p className="mt-2">
                            <strong>Email:</strong> rankbyhassan@gmail.com
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
