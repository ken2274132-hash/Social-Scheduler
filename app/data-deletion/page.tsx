import Link from 'next/link'

export const metadata = {
    title: 'Data Deletion | Feedquill',
    description: 'How to delete your data from Feedquill',
}

export default function DataDeletionPage() {
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
                    Data Deletion Instructions
                </h1>

                <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-8 space-y-6 text-gray-700 dark:text-gray-300">
                    <p className="text-sm text-gray-500">Last updated: January 19, 2026</p>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How to Delete Your Data</h2>
                        <p>
                            At Feedquill, we respect your right to control your personal data.
                            You can request deletion of your data at any time using the methods described below.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Option 1: Delete from Your Account Settings</h2>
                        <ol className="list-decimal pl-6 space-y-3">
                            <li>Log in to your Feedquill account</li>
                            <li>Navigate to <strong>Settings</strong></li>
                            <li>Scroll down to the <strong>Account</strong> section</li>
                            <li>Click on <strong>"Delete Account"</strong></li>
                            <li>Confirm your decision when prompted</li>
                        </ol>
                        <p className="mt-4 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                            <strong>⚠️ Warning:</strong> This action is irreversible. All your data, including
                            scheduled posts, connected accounts, and account information will be permanently deleted.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Option 2: Disconnect Social Media Accounts</h2>
                        <p>If you only want to remove your connected social media accounts:</p>
                        <ol className="list-decimal pl-6 space-y-3 mt-2">
                            <li>Log in to your Feedquill account</li>
                            <li>Go to <strong>Settings</strong> → <strong>Connected Accounts</strong></li>
                            <li>Click the <strong>disconnect</strong> button next to each account</li>
                            <li>Your social media tokens and profile data will be immediately deleted</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Option 3: Email Request</h2>
                        <p>
                            You can also request data deletion by sending an email to our support team:
                        </p>
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <p><strong>Email:</strong> rankbyhassan@gmail.com</p>
                            <p className="mt-2"><strong>Subject:</strong> Data Deletion Request</p>
                            <p className="mt-2"><strong>Include:</strong></p>
                            <ul className="list-disc pl-6 mt-1">
                                <li>Your registered email address</li>
                                <li>Your username (if applicable)</li>
                                <li>Confirmation that you want to delete all your data</li>
                            </ul>
                        </div>
                        <p className="mt-4">
                            We will process your request within <strong>30 days</strong> and send you a confirmation
                            once your data has been deleted.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">What Data Will Be Deleted</h2>
                        <p>When you request data deletion, we will remove:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Your account information (email, profile details)</li>
                            <li>All connected social media account tokens and profile data</li>
                            <li>All scheduled and published posts created through our Service</li>
                            <li>Any uploaded media files (images, videos)</li>
                            <li>Workspace and team membership data</li>
                            <li>Analytics and usage logs associated with your account</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Retention After Deletion</h2>
                        <p>
                            After processing your deletion request:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Your personal data will be permanently removed from our active systems</li>
                            <li>Backup data may persist for up to 30 days before automatic deletion</li>
                            <li>Anonymized, aggregated analytics data may be retained for service improvement</li>
                            <li>Data required for legal compliance may be retained as required by law</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Facebook/Instagram Data</h2>
                        <p>
                            When you disconnect your Facebook or Instagram account from Feedquill:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>We immediately delete the access tokens associated with your account</li>
                            <li>Profile information fetched from these platforms is removed</li>
                            <li>You can also revoke access from your Facebook/Instagram settings</li>
                        </ul>
                        <p className="mt-4">
                            To revoke access directly from Facebook:
                        </p>
                        <ol className="list-decimal pl-6 space-y-2 mt-2">
                            <li>Go to Facebook Settings → Security and Login</li>
                            <li>Click on "Apps and Websites"</li>
                            <li>Find "Feedquill App" and click "Remove"</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Contact Us</h2>
                        <p>
                            If you have any questions about data deletion or need assistance, please contact us:
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
