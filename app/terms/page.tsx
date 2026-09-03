import Link from 'next/link'

export const metadata = {
    title: 'Terms of Service | Feedquill',
    description: 'Terms of Service for Feedquill App',
}

export default function TermsOfServicePage() {
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
                    Terms of Service
                </h1>

                <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-8 space-y-6 text-gray-700 dark:text-gray-300">
                    <p className="text-sm text-gray-500">Last updated: January 19, 2026</p>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using Feedquill ("Service"), you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
                        <p>
                            Feedquill is a social media management tool that allows you to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Schedule and publish content to connected social media accounts</li>
                            <li>Manage multiple social media profiles from one dashboard</li>
                            <li>Create and organize content with AI-powered assistance</li>
                            <li>View analytics and engagement metrics</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Account Registration</h2>
                        <p>To use our Service, you must:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Be at least 13 years of age</li>
                            <li>Provide accurate and complete registration information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Accept responsibility for all activities under your account</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. User Responsibilities</h2>
                        <p>You agree to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Use the Service in compliance with all applicable laws</li>
                            <li>Not post content that is illegal, harmful, or violates third-party rights</li>
                            <li>Not use the Service for spam, harassment, or malicious purposes</li>
                            <li>Comply with the terms of service of connected social media platforms</li>
                            <li>Not attempt to reverse engineer or compromise the Service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Content Ownership</h2>
                        <p>
                            You retain ownership of all content you create and schedule through our Service.
                            By using our Service, you grant us a limited license to store, process, and transmit
                            your content solely for the purpose of providing our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Third-Party Services</h2>
                        <p>
                            Our Service integrates with third-party platforms such as Instagram and Facebook.
                            Your use of these platforms is subject to their respective terms of service and
                            privacy policies. We are not responsible for the actions of these third-party services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Service Availability</h2>
                        <p>
                            We strive to maintain high availability of our Service, but we do not guarantee
                            uninterrupted access. We may modify, suspend, or discontinue any aspect of the
                            Service at any time without prior notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, Feedquill shall not be liable for
                            any indirect, incidental, special, consequential, or punitive damages, including
                            but not limited to loss of profits, data, or business opportunities.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Disclaimer of Warranties</h2>
                        <p>
                            The Service is provided "as is" and "as available" without warranties of any kind,
                            either express or implied, including but not limited to implied warranties of
                            merchantability, fitness for a particular purpose, or non-infringement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Termination</h2>
                        <p>
                            We reserve the right to suspend or terminate your account at any time for violation
                            of these Terms. You may also terminate your account at any time by contacting us
                            or using the account deletion feature.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Changes to Terms</h2>
                        <p>
                            We may update these Terms from time to time. We will notify you of significant
                            changes by posting a notice on our website or sending you an email. Your continued
                            use of the Service after changes constitute acceptance of the updated Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Contact Us</h2>
                        <p>
                            If you have any questions about these Terms of Service, please contact us at:
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
