import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Check, ArrowRight, Zap, Shield, Share2, Globe, Clock, BarChart } from "lucide-react";

export default async function Home() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 selection:bg-blue-100 dark:selection:bg-blue-900">
            <Header user={user} />

            <main>
                {/* Hero Section */}
                <section className="relative flex items-center justify-center min-h-[calc(100vh-80px)] overflow-hidden">
                    {/* Background Gradients */}
                    <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-50/50 dark:from-blue-950/20 to-transparent pointer-events-none" />
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-100/50 dark:bg-purple-900/10 rounded-full blur-3xl" />

                    <div className="container mx-auto px-4 relative z-10 py-20 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <Zap size={14} />
                            <span>AI-Powered Automation for Instagram & Facebook</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            Post Everywhere. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_auto] animate-gradient">
                                Zero Effort.
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000">
                            Upload once, let AI create platform-optimized content, and schedule everything.
                            The fastest way to grow your social presence without the manual grind.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-16 duration-1000">
                            <Link
                                href={user ? "/dashboard" : "/signup"}
                                className="group px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-lg shadow-lg shadow-blue-500/25 flex items-center gap-2"
                            >
                                {user ? "Go to Dashboard" : "Start Growing Free"}
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="#features"
                                className="px-8 py-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all font-bold text-lg"
                            >
                                Explore Features
                            </a>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-32 bg-white dark:bg-gray-950">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">
                                Built for Modern Brands
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                                Stop wasting hours on manual posting. Our AI handles the captions,
                                hashtags, and scheduling while you focus on creating.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={<Zap className="text-blue-600" />}
                                title="AI Content Engine"
                                description="Tailored hooks, captions, and hashtags that actually resonate with your audience."
                            />
                            <FeatureCard
                                icon={<Clock className="text-purple-600" />}
                                title="Smart Scheduling"
                                description="Visual calendar planning. Drag, drop, and decide when your content goes live."
                            />
                            <FeatureCard
                                icon={<Shield className="text-green-600" />}
                                title="One-Click Connect"
                                description="Secure Facebook & Instagram integration in seconds. No complex dev setup required."
                            />
                            <FeatureCard
                                icon={<BarChart className="text-orange-600" />}
                                title="Growth Insights"
                                description="Track your posting consistency and see which AI variations perform the best."
                            />
                            <FeatureCard
                                icon={<Globe className="text-cyan-600" />}
                                title="Multi-Platform"
                                description="Post to Instagram and Facebook from one place. More platforms coming soon."
                            />
                            <FeatureCard
                                icon={<Share2 className="text-pink-600" />}
                                title="Team Collaboration"
                                description="Manage multiple brands with shared workspaces and client approvals."
                            />
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-32 bg-gray-50 dark:bg-gray-900/30">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">
                                Simple, Honest Pricing
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                                Choose the plan that's right for your growth stage.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            <PricingCard
                                tier="Free"
                                price="0"
                                description="Perfect for testing the waters."
                                features={["1 Workspace", "1 Social Account", "10 AI Generations/mo", "Basic Scheduling"]}
                            />
                            <PricingCard
                                tier="Pro"
                                price="29"
                                isPopular={true}
                                description="For serious creators and brands."
                                features={["3 Workspaces", "5 Social Accounts", "Unlimited AI", "Premium Support", "Priority Queue"]}
                            />
                            <PricingCard
                                tier="Agency"
                                price="99"
                                description="For teams managing many clients."
                                features={["Unlimited Workspaces", "Unlimited Accounts", "Team Collaboration", "White Label (Beta)", "Custom AI Models"]}
                            />
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <FAQ />
            </main>

            <Footer />
        </div>
    );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
    return (
        <div className="group p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1">
            <div className="w-12 h-12 bg-gray-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base">{description}</p>
        </div>
    );
}

function PricingCard({ tier, price, description, features, isPopular }: { tier: string; price: string; description: string; features: string[]; isPopular?: boolean }) {
    return (
        <div className={`relative p-8 rounded-3xl border ${isPopular ? 'border-blue-600 bg-blue-600/5' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950'} shadow-sm flex flex-col`}>
            {isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-widest">
                    Most Popular
                </div>
            )}
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{tier}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
            </div>
            <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-black text-gray-900 dark:text-white">${price}</span>
                <span className="text-gray-500 dark:text-gray-400">/month</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="mt-1 shrink-0 w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                            <Check size={10} strokeWidth={4} />
                        </div>
                        {feature}
                    </li>
                ))}
            </ul>
            <Link
                href="/signup"
                className={`w-full py-4 rounded-xl font-bold text-center transition-all ${isPopular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25' : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            >
                Get Started
            </Link>
        </div>
    )
}
