import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
    return (
        <>
            <Header />
            <main className="min-h-screen bg-white dark:bg-gray-950">
                {/* Hero Section */}
                <section className="container mx-auto px-4 py-20 text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                        Automate Your Social Media
                        <span className="block mt-2 text-blue-600">With AI-Powered Posting</span>
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                        Upload once, let AI create platform-optimized content, and schedule posts across Instagram and Facebook. No setup required.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <a
                            href="/signup"
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Get Started Free
                        </a>
                        <a
                            href="#features"
                            className="px-8 py-3 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors font-medium"
                        >
                            Learn More
                        </a>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="container mx-auto px-4 py-20">
                    <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                        Everything You Need to Succeed
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            title="AI Content Generation"
                            description="Automatically generate hooks, captions, and hashtags tailored for each platform."
                            icon="✨"
                        />
                        <FeatureCard
                            title="Smart Scheduling"
                            description="Visual calendar to plan and schedule your posts at the perfect time."
                            icon="📅"
                        />
                        <FeatureCard
                            title="Auto-Posting"
                            description="Posts publish automatically to Instagram and Facebook at scheduled times."
                            icon="🚀"
                        />
                        <FeatureCard
                            title="No Setup Required"
                            description="Just click 'Connect' and you're ready. No API keys or developer accounts needed."
                            icon="🔌"
                        />
                        <FeatureCard
                            title="Multi-Workspace"
                            description="Manage multiple brands or clients from one dashboard."
                            icon="🏢"
                        />
                        <FeatureCard
                            title="Content Library"
                            description="Keep all your media and posts organized in one place."
                            icon="📚"
                        />
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
    return (
        <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <div className="text-4xl mb-4">{icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
        </div>
    );
}
